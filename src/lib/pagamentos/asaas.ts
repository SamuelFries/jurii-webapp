import type {
  EfeitoDeWebhook,
  EntradaDeCheckout,
  ProvedorDePagamento,
  SessaoDeCheckout,
} from "./provedor";

/**
 * O Asaas.
 *
 * POR QUE ELE, e não o Stripe: PIX não é débito automático, então cobrança
 * recorrente em PIX significa gerar uma cobrança por ciclo e ir atrás de quem
 * deve. Isso é RÉGUA DE COBRANÇA, não integração de pagamento, e é o que o
 * Asaas faz por nós. Some-se que o cliente é escritório pequeno, que paga em
 * boleto porque o contador pede, e que faturar CNPJ vai exigir nota fiscal.
 *
 * Cada formato abaixo foi MEDIDO contra o sandbox, e não lembrado: criar
 * cliente, criar assinatura, listar as cobranças dela e ver o que uma
 * cobrança paga devolve. Onde o comentário afirma um campo, foi porque a API
 * respondeu com ele.
 */

/** Do enum do banco para o do Asaas. Só existem estes dois ciclos. */
const CICLO: Record<"monthly" | "annual", string> = {
  monthly: "MONTHLY",
  annual: "YEARLY",
};

/**
 * Os status de cobrança que importam, e o efeito de cada um.
 *
 * `RECEIVED_IN_CASH` entra junto com os outros dois porque é o que a baixa
 * manual devolve (foi o status que o sandbox deu ao confirmar uma cobrança à
 * mão). Deixá-lo de fora faria pagamento em dinheiro não liberar o acesso.
 *
 * O que NÃO está aqui é ignorado de propósito: status novo do provedor não
 * pode virar ativação por descuido.
 */
const EFEITO_POR_STATUS: Record<string, EfeitoDeWebhook["tipo"]> = {
  CONFIRMED: "ativar",
  RECEIVED: "ativar",
  RECEIVED_IN_CASH: "ativar",
  OVERDUE: "pagamento_pendente",
  REFUNDED: "cancelar",
  CHARGEBACK_REQUESTED: "cancelar",
  DELETED: "cancelar",
};

function exigeAmbiente(nome: string): string {
  const valor = process.env[nome];
  if (valor === undefined || valor === "") {
    // Falha ALTO e cedo. Provedor meio configurado erraria só na hora do
    // pagamento, que é o pior momento possível para descobrir.
    throw new Error(`${nome} ausente: o provedor de pagamento não pode operar.`);
  }
  return valor;
}

async function chamaAsaas(
  caminho: string,
  opcoes: { metodo?: string; corpo?: unknown } = {},
): Promise<Record<string, unknown>> {
  const base = process.env.ASAAS_BASE_URL ?? "https://api.asaas.com/v3";
  const resposta = await fetch(`${base}${caminho}`, {
    method: opcoes.metodo ?? "GET",
    headers: {
      access_token: exigeAmbiente("ASAAS_API_KEY"),
      "Content-Type": "application/json",
    },
    body: opcoes.corpo === undefined ? undefined : JSON.stringify(opcoes.corpo),
    // Nunca cacheado: é dinheiro, e resposta velha aqui é decisão errada.
    cache: "no-store",
  });

  const corpo = (await resposta.json()) as Record<string, unknown>;
  if (!resposta.ok) {
    const erros = corpo.errors as { description?: string }[] | undefined;
    throw new Error(
      `Asaas ${resposta.status} em ${caminho}: ${erros?.[0]?.description ?? "sem detalhe"}`,
    );
  }
  return corpo;
}

export const asaas: ProvedorDePagamento = {
  nome: "asaas",

  /**
   * Cria a cobrança e devolve a página onde se paga.
   *
   * `billingType: "UNDEFINED"` é a decisão central: em vez de escolhermos por
   * ele, a página do Asaas oferece PIX, boleto e cartão, e o escritório paga
   * como preferir. Fixar um meio aqui seria decidir pelo contador dos outros.
   *
   * O `externalReference` carrega o id da NOSSA assinatura, e é o que amarra
   * a cobrança de volta. Medido: a cobrança gerada pela assinatura HERDA esse
   * campo, então ele chega no webhook sem precisarmos guardar um mapa.
   */
  async criarCheckout(entrada: EntradaDeCheckout): Promise<SessaoDeCheckout> {
    const cliente = await chamaAsaas("/customers", {
      metodo: "POST",
      corpo: {
        name: entrada.nomeDoContratante,
        cpfCnpj: entrada.documentoDoContratante,
        email: entrada.emailDoContratante,
        // O id da assinatura também aqui: se um dia alguém abrir o painel do
        // Asaas para entender uma cobrança, o caminho de volta está no
        // cliente e na cobrança, não só num deles.
        externalReference: entrada.assinaturaId,
      },
    });

    const assinatura = await chamaAsaas("/subscriptions", {
      metodo: "POST",
      corpo: {
        customer: cliente.id,
        billingType: "UNDEFINED",
        value: entrada.valorEmCentavos / 100,
        nextDueDate: entrada.primeiroVencimentoIso.slice(0, 10),
        cycle: CICLO[entrada.billingCycle],
        description: entrada.descricao,
        externalReference: entrada.assinaturaId,
      },
    });

    // A ASSINATURA NÃO TEM URL: quem tem é a cobrança que ela gera. Medido no
    // sandbox, a resposta da assinatura traz `paymentLink` e
    // `checkoutSession` nulos, e o `invoiceUrl` só existe na cobrança.
    const cobrancas = await chamaAsaas(
      `/subscriptions/${String(assinatura.id)}/payments`,
    );
    const primeira = ((cobrancas.data as Record<string, unknown>[]) ?? [])[0];
    const url = primeira?.invoiceUrl;

    if (typeof url !== "string" || url === "") {
      throw new Error(
        "Asaas criou a assinatura mas não devolveu cobrança para pagar.",
      );
    }

    return { url };
  },

  /**
   * Interpreta a chamada do Asaas, SEM ACREDITAR NELA.
   *
   * A autenticação do webhook deles é um token estático em header, e não uma
   * assinatura HMAC do corpo como a do Stripe. Token de 32+ caracteres (a
   * própria API recusa menor) não é nada, mas é mais fraco: quem o descobrir
   * pode forjar uma chamada dizendo "pagamento aprovado".
   *
   * Por isso o corpo aqui vale como AVISO, nunca como fato. Ele serve para
   * saber QUAL cobrança olhar; o que decide é a consulta que fazemos à API do
   * Asaas com a nossa chave de servidor. Corpo forjado sobre uma cobrança que
   * não foi paga não ativa nada, porque a consulta desmente.
   */
  async processarWebhook(requisicao: Request): Promise<EfeitoDeWebhook> {
    const esperado = exigeAmbiente("ASAAS_WEBHOOK_TOKEN");
    const recebido = requisicao.headers.get("asaas-access-token");
    if (recebido !== esperado) {
      throw new Error("Token de webhook inválido.");
    }

    const corpo = (await requisicao.json()) as Record<string, unknown>;
    const cobrancaDoCorpo = corpo.payment as Record<string, unknown> | undefined;
    const cobrancaId = cobrancaDoCorpo?.id;

    if (typeof cobrancaId !== "string" || cobrancaId === "") {
      return { tipo: "ignorar", motivo: "evento sem cobrança" };
    }

    // A CONSULTA QUE DECIDE. Tudo que veio no corpo é descartado a partir
    // daqui, inclusive o status: só vale o que o Asaas responde para a nossa
    // chave.
    const cobranca = await chamaAsaas(`/payments/${cobrancaId}`);
    const status = String(cobranca.status ?? "");
    const assinaturaId = cobranca.externalReference;

    if (typeof assinaturaId !== "string" || assinaturaId === "") {
      return { tipo: "ignorar", motivo: "cobrança sem referência nossa" };
    }

    const tipo = EFEITO_POR_STATUS[status];
    if (tipo === undefined) {
      // Status que não conhecemos NÃO vira ativação. Pendente é o caso comum
      // (a cobrança nasce assim), e não é evento a aplicar.
      return { tipo: "ignorar", motivo: `status sem efeito: ${status}` };
    }

    return { tipo, assinaturaId } as EfeitoDeWebhook;
  },
};
