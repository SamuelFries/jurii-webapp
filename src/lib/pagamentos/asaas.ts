import { ChamadaNaoAutenticada } from "./provedor";
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

/**
 * O formato dos identificadores do Asaas, MEDIDO nas respostas do sandbox:
 * `pay_d77ethtflzlaz7qi`, `sub_1b6zbly0aib01d8y`, `cus_000008711947`.
 *
 * A guarda existe porque estes valores chegam do CORPO de uma chamada de
 * webhook, ou seja, de fora, e viram caminho de URL. Sem ela, um id com `../`
 * ou com query grudada montaria um caminho diferente do pretendido dentro da
 * API do provedor.
 */
const ID_DO_ASAAS = /^[a-z]{3}_[a-zA-Z0-9]+$/;

/**
 * O id da NOSSA assinatura, que vai e volta no `externalReference`.
 *
 * Ele acaba virando argumento uuid de `aplicar_efeito_de_pagamento`. Um
 * `externalReference` que não seja uuid (cobrança avulsa criada à mão no
 * painel do Asaas com qualquer texto ali) fazia o Postgres recusar o cast, a
 * rota devolver 500, e o Asaas reentregar o mesmo evento para sempre: uma
 * fila travada num evento que nunca ia dar certo. Aqui ele é filtrado na
 * fronteira, onde já ignoramos cobrança que não é nossa.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * O vencimento nunca nasce no passado.
 *
 * MEDIDO: a API responde 400 `invalid_nextDueDate`, "Não é permitido data de
 * vencimento inferior a hoje". Como o vencimento que mandamos é o fim do
 * teste grátis, QUEM DEIXOU O TESTE VENCER caía exatamente aqui: a pessoa
 * decidia pagar e o checkout morria, que é o pior momento possível para uma
 * porta fechar.
 *
 * O hoje é em UTC de propósito. O Brasil está em UTC-3, então a data UTC
 * nunca é ANTERIOR à data brasileira, e o erro que existe é impossível. No
 * máximo o vencimento cai um dia à frente, que a API aceita sem reclamar.
 */
function vencimentoNoFuturo(iso: string): string {
  const hoje = new Date().toISOString().slice(0, 10);
  const pedido = iso.slice(0, 10);
  return pedido < hoje ? hoje : pedido;
}

/**
 * A assinatura que JÁ EXISTE no provedor para esta assinatura nossa.
 *
 * MEDIDO: `GET /subscriptions?externalReference=<id>` devolve `data` com as
 * assinaturas daquela referência. Só a `ACTIVE` interessa: reaproveitar uma
 * expirada devolveria uma cobrança que não dá para pagar.
 */
async function assinaturaJaCriada(
  assinaturaId: string,
): Promise<Record<string, unknown> | null> {
  const busca = await chamaAsaas(
    `/subscriptions?externalReference=${encodeURIComponent(assinaturaId)}`,
  );
  const linhas = (busca.data as Record<string, unknown>[]) ?? [];
  return linhas.find((linha) => linha.status === "ACTIVE") ?? null;
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
   *
   * E É IDEMPOTENTE, que era o que faltava. Antes cada clique em "Ativar
   * cobrança" criava OUTRA assinatura recorrente no Asaas, com a mesma
   * referência: dois cliques, duas cobranças mensais para sempre. Pior, a
   * pessoa pagava uma e a duplicata vencia sozinha, e o `OVERDUE` da duplicata
   * jogava de volta para `past_due` quem tinha acabado de pagar.
   *
   * O `externalReference` é a chave de idempotência, e não precisou de coluna
   * nova: ele já ia junto, e o provedor sabe buscar por ele.
   */
  async criarCheckout(entrada: EntradaDeCheckout): Promise<SessaoDeCheckout> {
    const valor = entrada.valorEmCentavos / 100;
    const ciclo = CICLO[entrada.billingCycle];
    const existente = await assinaturaJaCriada(entrada.assinaturaId);

    let assinaturaNoAsaas: string;

    if (existente === null) {
      const cliente = await chamaAsaas("/customers", {
        metodo: "POST",
        corpo: {
          name: entrada.nomeDoContratante,
          cpfCnpj: entrada.documentoDoContratante,
          email: entrada.emailDoContratante,
          // O id da assinatura também aqui: se um dia alguém abrir o painel
          // do Asaas para entender uma cobrança, o caminho de volta está no
          // cliente e na cobrança, não só num deles.
          externalReference: entrada.assinaturaId,
        },
      });

      const criada = await chamaAsaas("/subscriptions", {
        metodo: "POST",
        corpo: {
          customer: cliente.id,
          billingType: "UNDEFINED",
          value: valor,
          nextDueDate: vencimentoNoFuturo(entrada.primeiroVencimentoIso),
          cycle: ciclo,
          description: entrada.descricao,
          externalReference: entrada.assinaturaId,
        },
      });
      assinaturaNoAsaas = String(criada.id);
    } else {
      assinaturaNoAsaas = String(existente.id);

      // O PLANO PODE TER MUDADO desde o primeiro clique. Trocar de plano é um
      // UPDATE no nosso banco, e sem esta reconciliação o provedor seguiria
      // cobrando o valor antigo: quem subiu de plano usaria a equipe grande
      // pagando barato, e quem desceu continuaria pagando caro.
      //
      // `updatePendingPayments` é obrigatório e foi MEDIDO: sem ele o PUT
      // muda a assinatura para 348 e a cobrança pendente FICA em 149, ou
      // seja, o furo continua aberto na única cobrança que a pessoa vai
      // pagar. `nextDueDate` fica de fora de propósito: a assinatura que já
      // existe tem um vencimento válido, e reenviar "hoje" encurtaria o teste
      // grátis de quem só quis deixar o pagamento pronto.
      if (Number(existente.value) !== valor || String(existente.cycle) !== ciclo) {
        await chamaAsaas(`/subscriptions/${assinaturaNoAsaas}`, {
          metodo: "PUT",
          corpo: {
            value: valor,
            cycle: ciclo,
            description: entrada.descricao,
            updatePendingPayments: true,
          },
        });
      }
    }

    // A ASSINATURA NÃO TEM URL: quem tem é a cobrança que ela gera. Medido no
    // sandbox, a resposta da assinatura traz `paymentLink` e
    // `checkoutSession` nulos, e o `invoiceUrl` só existe na cobrança.
    const cobrancas = await chamaAsaas(
      `/subscriptions/${assinaturaNoAsaas}/payments`,
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
      // TIPO PRÓPRIO: só isto merece 401. Qualquer outra falha daqui para
      // baixo é nossa, e precisa de 500 para o Asaas reentregar.
      throw new ChamadaNaoAutenticada("Token de webhook inválido.");
    }

    const corpo = (await requisicao.json()) as Record<string, unknown>;
    const cobrancaDoCorpo = corpo.payment as Record<string, unknown> | undefined;
    const cobrancaId = cobrancaDoCorpo?.id;

    // O id vem de FORA e vira caminho de URL logo abaixo, então ele passa
    // pelo formato medido do provedor antes de ser concatenado.
    if (typeof cobrancaId !== "string" || !ID_DO_ASAAS.test(cobrancaId)) {
      return { tipo: "ignorar", motivo: "evento sem cobrança" };
    }

    // A CONSULTA QUE DECIDE. Tudo que veio no corpo é descartado a partir
    // daqui, inclusive o status: só vale o que o Asaas responde para a nossa
    // chave.
    const cobranca = await chamaAsaas(`/payments/${cobrancaId}`);
    const status = String(cobranca.status ?? "");
    const assinaturaId = cobranca.externalReference;

    // REFERÊNCIA QUE NÃO É NOSSA É IGNORADA, e "não é nossa" inclui texto que
    // não tem forma de uuid. Cobrança avulsa criada à mão no painel do Asaas
    // pode ter qualquer coisa aqui; sem o filtro, esse texto virava argumento
    // uuid de aplicar_efeito_de_pagamento, o Postgres recusava o cast, a rota
    // devolvia 500, e o Asaas reentregava o mesmo evento para sempre. Uma
    // cobrança de outra pessoa travava a fila inteira.
    if (typeof assinaturaId !== "string" || !UUID.test(assinaturaId)) {
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
