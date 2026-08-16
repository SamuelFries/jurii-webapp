import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { asaas } from "./asaas";
import { ChamadaNaoAutenticada } from "./provedor";

/**
 * Os formatos daqui foram MEDIDOS contra o sandbox do Asaas antes de virarem
 * teste. O teste roda sem rede porque CI não pode depender de um provedor de
 * terceiro estar de pé, mas o que ele simula é o que a API respondeu.
 */
const TOKEN = "token-de-webhook-com-mais-de-32-caracteres";

/** O id da NOSSA assinatura. Tem forma de uuid porque é o que ele é: a
 * chave primária de law_firm_license_subscriptions, que volta no
 * externalReference da cobrança. */
const ASSINATURA = "6f1f2f3f-4f5f-4f6f-8f7f-9f8f7f6f5f4f";

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
          externalReference: ASSINATURA,
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
          externalReference: ASSINATURA,
        },
      }),
    );

    const efeito = await asaas.processarWebhook(
      requisicao({ event: "PAYMENT_RECEIVED", payment: { id: "pay_1" } }),
    );

    expect(efeito).toEqual({ tipo: "ativar", assinaturaId: ASSINATURA });
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
          externalReference: ASSINATURA,
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
          "/payments/pay_1": { id: "pay_1", status, externalReference: ASSINATURA },
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
          externalReference: ASSINATURA,
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

describe("a corrida entre dois cliques", () => {
  test("com o id GRAVADO, nem chega a buscar: a busca não fecha corrida", async () => {
    // Procurar antes de criar é uma foto do provedor num instante, e duas
    // chamadas simultâneas tiram a mesma foto vazia. Quem fecha a corrida é o
    // índice único da coluna provider_subscription_id; a busca ficou como
    // recurso para as linhas anteriores a ela.
    const chamadas: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL) => {
        const caminho = String(url).replace(/^.*\/v3/, "");
        chamadas.push(caminho);
        if (caminho === "/subscriptions/sub_gravada") {
          return new Response(
            JSON.stringify({ id: "sub_gravada", value: 149, cycle: "MONTHLY" }),
            { status: 200 },
          );
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
      assinaturaId: ASSINATURA,
      planCode: "essencial",
      billingCycle: "monthly",
      emailDoContratante: "socio@jurii.local",
      nomeDoContratante: "Joao Socio",
      documentoDoContratante: "24971563792",
      valorEmCentavos: 14900,
      primeiroVencimentoIso: "2026-09-13T00:00:00Z",
      descricao: "Jurii Essencial (mensal)",
      assinaturaNoProvedorConhecida: "sub_gravada",
    });

    expect(sessao.assinaturaNoProvedor).toBe("sub_gravada");
    expect(chamadas).toEqual([
      "/subscriptions/sub_gravada",
      "/subscriptions/sub_gravada/payments",
    ]);
    // NENHUMA busca por referência: o id gravado é a fonte de verdade.
    expect(chamadas.some((c) => c.includes("externalReference"))).toBe(false);
  });

  test("duas assinaturas ativas na mesma referência: usa sempre a MAIS ANTIGA", async () => {
    // Quando a duplicata já existe (criada antes da coluna), escolher sempre a
    // mesma é o que faz a reconciliação de plano cair sempre na mesma
    // assinatura. Com `.find` ela corrigia uma e deixava a outra cobrando o
    // valor velho para sempre.
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL) => {
        const caminho = String(url).replace(/^.*\/v3/, "");
        if (caminho.startsWith("/subscriptions?externalReference=")) {
          return new Response(
            JSON.stringify({
              // A MAIS ANTIGA FICA NO MEIO de propósito: com ela na ponta,
              // pegar "a primeira" ou "a última" da lista acertaria por
              // acidente, e o teste passaria sem exigir ordenação nenhuma.
              data: [
                { id: "sub_nova", status: "ACTIVE", value: 149, cycle: "MONTHLY", dateCreated: "2026-08-14" },
                { id: "sub_antiga", status: "ACTIVE", value: 149, cycle: "MONTHLY", dateCreated: "2026-06-01" },
                { id: "sub_meio", status: "ACTIVE", value: 149, cycle: "MONTHLY", dateCreated: "2026-07-20" },
              ],
            }),
            { status: 200 },
          );
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
      assinaturaId: ASSINATURA,
      planCode: "essencial",
      billingCycle: "monthly",
      emailDoContratante: "socio@jurii.local",
      nomeDoContratante: "Joao Socio",
      documentoDoContratante: "24971563792",
      valorEmCentavos: 14900,
      primeiroVencimentoIso: "2026-09-13T00:00:00Z",
      descricao: "Jurii Essencial (mensal)",
      assinaturaNoProvedorConhecida: null,
    });

    expect(sessao.assinaturaNoProvedor).toBe("sub_antiga");
  });

  test("quem perde a corrida apaga a própria duplicata", async () => {
    // MEDIDO: DELETE /subscriptions/{id} responde {deleted:true} e some da
    // busca. Deixá-la de pé seria uma segunda mensalidade recorrente na conta
    // de quem clicou duas vezes.
    const chamadas: { caminho: string; metodo?: string }[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL, opcoes?: RequestInit) => {
        chamadas.push({
          caminho: String(url).replace(/^.*\/v3/, ""),
          metodo: opcoes?.method,
        });
        return new Response(JSON.stringify({ deleted: true }), { status: 200 });
      }),
    );

    await asaas.descartarAssinaturaDuplicada("sub_perdedora");
    expect(chamadas).toEqual([
      { caminho: "/subscriptions/sub_perdedora", metodo: "DELETE" },
    ]);
  });

  test("e o descarte recusa id fora do formato antes de virar caminho de URL", async () => {
    const fetchFalso = apiFalsa({});
    vi.stubGlobal("fetch", fetchFalso);

    await expect(
      asaas.descartarAssinaturaDuplicada("../../customers"),
    ).rejects.toThrow("fora do formato");
    await expect(
      asaas.linkDePagamentoDe("sub_1/../../customers"),
    ).rejects.toThrow("fora do formato");
    expect(fetchFalso).not.toHaveBeenCalled();
  });
});

describe("guardas da fronteira do provedor", () => {
  test("referência que não é uuid é IGNORADA, e não repassada ao banco", async () => {
    // Cobrança avulsa criada à mão no painel do Asaas pode ter qualquer texto
    // em externalReference. Sem esta guarda o texto virava argumento uuid de
    // aplicar_efeito_de_pagamento, o Postgres recusava o cast, a rota
    // devolvia 500, e o Asaas reentregava o MESMO evento para sempre: uma
    // cobrança de outra pessoa travava a fila inteira.
    vi.stubGlobal(
      "fetch",
      apiFalsa({
        "/payments/pay_1": {
          id: "pay_1",
          status: "RECEIVED",
          externalReference: "pedido interno 4471",
        },
      }),
    );

    const efeito = await asaas.processarWebhook(
      requisicao({ payment: { id: "pay_1" } }),
    );
    expect(efeito.tipo).toBe("ignorar");
  });

  test("id de cobrança fora do formato do provedor não vira caminho de URL", async () => {
    // O id vem do CORPO da chamada, ou seja, de fora, e é concatenado num
    // caminho da API do Asaas. Formato medido no sandbox: pay_<alfanumérico>.
    const fetchFalso = apiFalsa({});
    vi.stubGlobal("fetch", fetchFalso);

    for (const id of [
      "../../customers",
      "pay_1/../../customers",
      "pay_1?limit=100",
      "",
    ]) {
      const efeito = await asaas.processarWebhook(
        requisicao({ payment: { id } }),
      );
      expect(efeito.tipo, `id ${JSON.stringify(id)}`).toBe("ignorar");
    }

    // E nenhum deles chegou a virar consulta.
    expect(fetchFalso).not.toHaveBeenCalled();
  });

  test("token inválido tem TIPO próprio, para virar 401 e não 500", async () => {
    // A rota decide reentrega por este tipo: forjada não se reentrega,
    // falha nossa se reentrega. Ver a rota do webhook.
    vi.stubGlobal("fetch", apiFalsa({}));
    await expect(
      asaas.processarWebhook(requisicao({ payment: { id: "pay_1" } }, "outro")),
    ).rejects.toBeInstanceOf(ChamadaNaoAutenticada);
  });

  test("falha de REDE na consulta NÃO é falha de autenticação", async () => {
    // A distinção que faltava: enquanto a rota tratava as duas igual, um
    // timeout na consulta virava 401 e o Asaas lia "recusado", sem tentar de
    // novo. Pagamento recebido e nunca aplicado.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed");
      }),
    );

    await expect(
      asaas.processarWebhook(requisicao({ payment: { id: "pay_1" } })),
    ).rejects.not.toBeInstanceOf(ChamadaNaoAutenticada);
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
        if (caminho.startsWith("/subscriptions?externalReference=")) {
          // Ninguém pagou ainda: a busca de idempotência não acha nada.
          return new Response(JSON.stringify({ data: [], totalCount: 0 }), {
            status: 200,
          });
        }
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
      assinaturaNoProvedorConhecida: null,
    });

    expect(sessao.url).toBe("https://sandbox.asaas.com/i/abc");
    expect(chamadas).toEqual([
      "/subscriptions?externalReference=assinatura-1",
      "/customers",
      "/subscriptions",
      "/subscriptions/sub_1/payments",
    ]);
  });

  test("SEGUNDO clique não cria a segunda assinatura: reusa a que existe", async () => {
    // O furo mais caro do checkout. Cada clique em "Ativar cobrança" criava
    // OUTRA assinatura recorrente com a mesma referência: dois cliques, duas
    // mensalidades para sempre. E a duplicata que ninguém paga vence sozinha,
    // e o OVERDUE dela joga de volta para past_due quem acabou de pagar.
    const chamadas: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL) => {
        const caminho = String(url).replace(/^.*\/v3/, "");
        chamadas.push(caminho);
        if (caminho.startsWith("/subscriptions?externalReference=")) {
          return new Response(
            JSON.stringify({
              data: [
                {
                  id: "sub_1",
                  status: "ACTIVE",
                  value: 149,
                  cycle: "MONTHLY",
                },
              ],
            }),
            { status: 200 },
          );
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
      billingCycle: "monthly",
      emailDoContratante: "socio@jurii.local",
      nomeDoContratante: "Joao Socio",
      documentoDoContratante: "24971563792",
      valorEmCentavos: 14900,
      primeiroVencimentoIso: "2026-09-13T00:00:00Z",
      descricao: "Jurii Essencial (mensal)",
      assinaturaNoProvedorConhecida: null,
    });

    // A mesma URL de pagamento, e NENHUM POST: nem cliente novo, nem
    // assinatura nova, nem PUT (valor e ciclo não mudaram).
    expect(sessao.url).toBe("https://sandbox.asaas.com/i/abc");
    expect(chamadas).toEqual([
      "/subscriptions?externalReference=assinatura-1",
      "/subscriptions/sub_1/payments",
    ]);
  });

  test("plano trocado no meio do caminho RECOBRA o valor certo no provedor", async () => {
    // A outra metade do mesmo furo, e a que é simétrica: trocar de plano é um
    // UPDATE no nosso banco. Sem reconciliar aqui, quem subiu de plano usaria
    // a equipe grande pagando barato, e quem desceu seguiria pagando caro.
    const corpos: Record<string, unknown>[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL, opcoes?: RequestInit) => {
        const caminho = String(url).replace(/^.*\/v3/, "");
        if (opcoes?.body) {
          corpos.push({
            caminho,
            metodo: opcoes.method,
            ...(JSON.parse(String(opcoes.body)) as Record<string, unknown>),
          });
        }
        if (caminho.startsWith("/subscriptions?externalReference=")) {
          return new Response(
            JSON.stringify({
              data: [
                { id: "sub_1", status: "ACTIVE", value: 149, cycle: "MONTHLY" },
              ],
            }),
            { status: 200 },
          );
        }
        return new Response(
          JSON.stringify({
            data: [{ id: "pay_1", invoiceUrl: "https://sandbox.asaas.com/i/nova" }],
          }),
          { status: 200 },
        );
      }),
    );

    await asaas.criarCheckout({
      assinaturaId: "assinatura-1",
      planCode: "banca",
      billingCycle: "monthly",
      emailDoContratante: "socio@jurii.local",
      nomeDoContratante: "Joao Socio",
      documentoDoContratante: "24971563792",
      valorEmCentavos: 69900,
      primeiroVencimentoIso: "2026-09-13T00:00:00Z",
      descricao: "Jurii Banca (mensal)",
      assinaturaNoProvedorConhecida: null,
    });

    expect(corpos).toEqual([
      {
        caminho: "/subscriptions/sub_1",
        metodo: "PUT",
        value: 699,
        cycle: "MONTHLY",
        description: "Jurii Banca (mensal)",
        // MEDIDO no sandbox, e é a linha que decide: sem ela o PUT muda a
        // assinatura para 699 e a cobrança PENDENTE fica em 149, ou seja, o
        // furo continua aberto na única cobrança que a pessoa vai pagar.
        updatePendingPayments: true,
      },
    ]);
  });

  test("teste JÁ VENCIDO ainda consegue pagar: o vencimento não nasce no passado", async () => {
    // MEDIDO contra a API: nextDueDate no passado devolve 400
    // invalid_nextDueDate, "Não é permitido data de vencimento inferior a
    // hoje". Como o vencimento que mandamos é o fim do teste, quem deixou o
    // teste vencer caía exatamente aqui: decidia pagar e o checkout morria.
    const corpos: Record<string, unknown>[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL, opcoes?: RequestInit) => {
        const caminho = String(url).replace(/^.*\/v3/, "");
        if (opcoes?.body) {
          corpos.push(JSON.parse(String(opcoes.body)) as Record<string, unknown>);
        }
        if (caminho.startsWith("/subscriptions?externalReference=")) {
          return new Response(JSON.stringify({ data: [] }), { status: 200 });
        }
        if (caminho === "/customers") {
          return new Response(JSON.stringify({ id: "cus_1" }), { status: 200 });
        }
        if (caminho === "/subscriptions") {
          return new Response(JSON.stringify({ id: "sub_1" }), { status: 200 });
        }
        return new Response(
          JSON.stringify({
            data: [{ id: "pay_1", invoiceUrl: "https://sandbox.asaas.com/i/abc" }],
          }),
          { status: 200 },
        );
      }),
    );

    await asaas.criarCheckout({
      assinaturaId: "assinatura-1",
      planCode: "essencial",
      billingCycle: "monthly",
      emailDoContratante: "socio@jurii.local",
      nomeDoContratante: "Joao Socio",
      documentoDoContratante: "24971563792",
      valorEmCentavos: 14900,
      // Teste que acabou em 2020: o caso de quem some e volta para pagar.
      primeiroVencimentoIso: "2020-01-01T00:00:00Z",
      descricao: "Jurii Essencial (mensal)",
      assinaturaNoProvedorConhecida: null,
    });

    const hoje = new Date().toISOString().slice(0, 10);
    const assinatura = corpos.find((c) => "nextDueDate" in c);
    expect(assinatura?.nextDueDate).toBe(hoje);
  });

  test("e o vencimento FUTURO é respeitado: assinar cedo não encurta o teste", async () => {
    // A outra ponta da mesma regra. Trocar a data por "hoje" sempre seria
    // cobrar no ato de quem só quis deixar o pagamento pronto.
    const corpos: Record<string, unknown>[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL, opcoes?: RequestInit) => {
        const caminho = String(url).replace(/^.*\/v3/, "");
        if (opcoes?.body) {
          corpos.push(JSON.parse(String(opcoes.body)) as Record<string, unknown>);
        }
        if (caminho.startsWith("/subscriptions?externalReference=")) {
          return new Response(JSON.stringify({ data: [] }), { status: 200 });
        }
        if (caminho === "/customers") {
          return new Response(JSON.stringify({ id: "cus_1" }), { status: 200 });
        }
        if (caminho === "/subscriptions") {
          return new Response(JSON.stringify({ id: "sub_1" }), { status: 200 });
        }
        return new Response(
          JSON.stringify({
            data: [{ id: "pay_1", invoiceUrl: "https://sandbox.asaas.com/i/abc" }],
          }),
          { status: 200 },
        );
      }),
    );

    const daquiUmAno = new Date(Date.now() + 365 * 86_400_000)
      .toISOString()
      .slice(0, 10);

    await asaas.criarCheckout({
      assinaturaId: "assinatura-1",
      planCode: "essencial",
      billingCycle: "monthly",
      emailDoContratante: "socio@jurii.local",
      nomeDoContratante: "Joao Socio",
      documentoDoContratante: "24971563792",
      valorEmCentavos: 14900,
      primeiroVencimentoIso: `${daquiUmAno}T00:00:00Z`,
      descricao: "Jurii Essencial (mensal)",
      assinaturaNoProvedorConhecida: null,
    });

    expect(corpos.find((c) => "nextDueDate" in c)?.nextDueDate).toBe(daquiUmAno);
  });

  test("assinatura EXPIRADA no provedor não é reusada: geraria link morto", async () => {
    const chamadas: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL) => {
        const caminho = String(url).replace(/^.*\/v3/, "");
        chamadas.push(caminho);
        if (caminho.startsWith("/subscriptions?externalReference=")) {
          return new Response(
            JSON.stringify({
              data: [
                { id: "sub_velha", status: "EXPIRED", value: 149, cycle: "MONTHLY" },
              ],
            }),
            { status: 200 },
          );
        }
        if (caminho === "/customers") {
          return new Response(JSON.stringify({ id: "cus_1" }), { status: 200 });
        }
        if (caminho === "/subscriptions") {
          return new Response(JSON.stringify({ id: "sub_nova" }), { status: 200 });
        }
        return new Response(
          JSON.stringify({
            data: [{ id: "pay_1", invoiceUrl: "https://sandbox.asaas.com/i/abc" }],
          }),
          { status: 200 },
        );
      }),
    );

    await asaas.criarCheckout({
      assinaturaId: "assinatura-1",
      planCode: "essencial",
      billingCycle: "monthly",
      emailDoContratante: "socio@jurii.local",
      nomeDoContratante: "Joao Socio",
      documentoDoContratante: "24971563792",
      valorEmCentavos: 14900,
      primeiroVencimentoIso: "2026-09-13T00:00:00Z",
      descricao: "Jurii Essencial (mensal)",
      assinaturaNoProvedorConhecida: null,
    });

    expect(chamadas).toContain("/subscriptions");
    expect(chamadas).toContain("/subscriptions/sub_nova/payments");
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
        assinaturaNoProvedorConhecida: null,
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
