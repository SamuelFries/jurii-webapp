import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { asaas } from "./asaas";

/**
 * Os formatos daqui foram MEDIDOS contra o sandbox do Asaas antes de virarem
 * teste. O teste roda sem rede porque CI não pode depender de um provedor de
 * terceiro estar de pé, mas o que ele simula é o que a API respondeu.
 */
const TOKEN = "token-de-webhook-com-mais-de-32-caracteres";

function requisicao(corpo: unknown, token: string = TOKEN): Request {
  return new Request("https://app.jurii.com.br/api/webhooks/pagamento", {
    method: "POST",
    headers: { "asaas-access-token": token },
    body: JSON.stringify(corpo),
  });
}

/** Uma API falsa que responde por caminho, para cada teste montar o cenário. */
function apiFalsa(respostas: Record<string, unknown>) {
  return vi.fn(async (url: string | URL) => {
    const caminho = String(url).replace(/^.*\/v3/, "");
    const achado = Object.entries(respostas).find(([rota]) =>
      caminho.startsWith(rota),
    );
    if (achado === undefined) {
      return new Response(JSON.stringify({ errors: [{ description: "sem rota" }] }), {
        status: 404,
      });
    }
    return new Response(JSON.stringify(achado[1]), { status: 200 });
  });
}

beforeEach(() => {
  process.env.ASAAS_API_KEY = "chave-falsa-de-teste-nunca-usada";
  process.env.ASAAS_BASE_URL = "https://api-sandbox.asaas.com/v3";
  process.env.ASAAS_WEBHOOK_TOKEN = TOKEN;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("webhook do Asaas", () => {
  test("token errado é recusado antes de qualquer consulta", async () => {
    const fetchFalso = apiFalsa({});
    vi.stubGlobal("fetch", fetchFalso);

    await expect(
      asaas.processarWebhook(requisicao({ payment: { id: "pay_1" } }, "outro")),
    ).rejects.toThrow("Token de webhook inválido");

    // NÃO consultou nada: token errado nem chega a gastar chamada.
    expect(fetchFalso).not.toHaveBeenCalled();
  });

  test("o CORPO NÃO DECIDE: cobrança pendente não ativa, mesmo o corpo dizendo que recebeu", async () => {
    // A propriedade que faz o token estático do Asaas deixar de ser o que
    // segura a porta. Medido no sandbox: o mesmo corpo forjado devolve
    // "ignorar" enquanto a cobrança está PENDING.
    vi.stubGlobal(
      "fetch",
      apiFalsa({
        "/payments/pay_1": {
          id: "pay_1",
          status: "PENDING",
          externalReference: "assinatura-1",
        },
      }),
    );

    const efeito = await asaas.processarWebhook(
      requisicao({ event: "PAYMENT_RECEIVED", payment: { id: "pay_1", status: "RECEIVED" } }),
    );

    expect(efeito.tipo).toBe("ignorar");
  });

  test("e ativa quando a CONSULTA confirma o pagamento", async () => {
    vi.stubGlobal(
      "fetch",
      apiFalsa({
        "/payments/pay_1": {
          id: "pay_1",
          status: "RECEIVED",
          externalReference: "assinatura-1",
        },
      }),
    );

    const efeito = await asaas.processarWebhook(
      requisicao({ event: "PAYMENT_RECEIVED", payment: { id: "pay_1" } }),
    );

    expect(efeito).toEqual({ tipo: "ativar", assinaturaId: "assinatura-1" });
  });

  test("pagamento em dinheiro também libera", async () => {
    // RECEIVED_IN_CASH é o status da baixa manual, e foi o que o sandbox
    // devolveu ao confirmar à mão. Deixá-lo de fora faria pagamento em
    // dinheiro não liberar o acesso.
    vi.stubGlobal(
      "fetch",
      apiFalsa({
        "/payments/pay_1": {
          id: "pay_1",
          status: "RECEIVED_IN_CASH",
          externalReference: "assinatura-1",
        },
      }),
    );

    expect((await asaas.processarWebhook(requisicao({ payment: { id: "pay_1" } }))).tipo).toBe(
      "ativar",
    );
  });

  test("atraso vira pendência, estorno vira cancelamento", async () => {
    for (const [status, esperado] of [
      ["OVERDUE", "pagamento_pendente"],
      ["REFUNDED", "cancelar"],
      ["CHARGEBACK_REQUESTED", "cancelar"],
    ] as const) {
      vi.stubGlobal(
        "fetch",
        apiFalsa({
          "/payments/pay_1": { id: "pay_1", status, externalReference: "a1" },
        }),
      );
      const efeito = await asaas.processarWebhook(
        requisicao({ payment: { id: "pay_1" } }),
      );
      expect(efeito.tipo, `status ${status}`).toBe(esperado);
    }
  });

  test("status DESCONHECIDO não vira ativação", async () => {
    // Se o Asaas criar um status novo amanhã, ele não pode liberar acesso
    // por descuido. O silêncio aqui é a decisão.
    vi.stubGlobal(
      "fetch",
      apiFalsa({
        "/payments/pay_1": {
          id: "pay_1",
          status: "STATUS_QUE_NAO_EXISTIA",
          externalReference: "a1",
        },
      }),
    );

    expect((await asaas.processarWebhook(requisicao({ payment: { id: "pay_1" } }))).tipo).toBe(
      "ignorar",
    );
  });

  test("cobrança sem a nossa referência é ignorada, e não adivinhada", async () => {
    // Cobrança avulsa criada no painel do Asaas não é assinatura da Jurii.
    // Tentar adivinhar de quem é seria ativar a assinatura de outra pessoa.
    vi.stubGlobal(
      "fetch",
      apiFalsa({ "/payments/pay_1": { id: "pay_1", status: "RECEIVED" } }),
    );

    expect((await asaas.processarWebhook(requisicao({ payment: { id: "pay_1" } }))).tipo).toBe(
      "ignorar",
    );
  });

  test("evento sem cobrança não estoura", async () => {
    vi.stubGlobal("fetch", apiFalsa({}));
    expect((await asaas.processarWebhook(requisicao({ event: "OUTRA_COISA" }))).tipo).toBe(
      "ignorar",
    );
  });
});

describe("checkout do Asaas", () => {
  test("cria cliente e assinatura, e devolve a URL da COBRANÇA", async () => {
    // A assinatura NÃO tem URL de pagamento: quem tem é a cobrança que ela
    // gera. Medido no sandbox, onde a resposta da assinatura traz
    // paymentLink e checkoutSession nulos.
    const chamadas: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL) => {
        const caminho = String(url).replace(/^.*\/v3/, "");
        chamadas.push(caminho);
        if (caminho === "/customers") {
          return new Response(JSON.stringify({ id: "cus_1" }), { status: 200 });
        }
        if (caminho === "/subscriptions") {
          return new Response(JSON.stringify({ id: "sub_1", paymentLink: null }), {
            status: 200,
          });
        }
        return new Response(
          JSON.stringify({
            data: [{ id: "pay_1", invoiceUrl: "https://sandbox.asaas.com/i/abc" }],
          }),
          { status: 200 },
        );
      }),
    );

    const sessao = await asaas.criarCheckout({
      assinaturaId: "assinatura-1",
      planCode: "essencial",
      billingCycle: "annual",
      emailDoContratante: "socio@jurii.local",
      nomeDoContratante: "Joao Socio",
      documentoDoContratante: "24971563792",
      valorEmCentavos: 148800,
      primeiroVencimentoIso: "2026-09-13T00:00:00Z",
      descricao: "Jurii Essencial (anual)",
    });

    expect(sessao.url).toBe("https://sandbox.asaas.com/i/abc");
    expect(chamadas).toEqual([
      "/customers",
      "/subscriptions",
      "/subscriptions/sub_1/payments",
    ]);
  });

  test("assinatura sem cobrança para pagar falha ALTO", async () => {
    // Silenciar isto entregaria à pessoa um botão que leva a lugar nenhum,
    // no exato momento em que ela quer pagar.
    vi.stubGlobal(
      "fetch",
      apiFalsa({
        "/customers": { id: "cus_1" },
        "/subscriptions/sub_1/payments": { data: [] },
        "/subscriptions": { id: "sub_1" },
      }),
    );

    await expect(
      asaas.criarCheckout({
        assinaturaId: "a1",
        planCode: "essencial",
        billingCycle: "monthly",
        emailDoContratante: "a@b.c",
        nomeDoContratante: "Fulano",
        documentoDoContratante: "24971563792",
        valorEmCentavos: 14900,
        primeiroVencimentoIso: "2026-09-13T00:00:00Z",
        descricao: "x",
      }),
    ).rejects.toThrow("não devolveu cobrança");
  });

  test("sem chave configurada, falha antes de tentar cobrar", async () => {
    delete process.env.ASAAS_API_KEY;
    vi.stubGlobal("fetch", apiFalsa({}));

    await expect(
      asaas.processarWebhook(requisicao({ payment: { id: "pay_1" } })),
    ).rejects.toThrow("ASAAS_API_KEY ausente");
  });
});
