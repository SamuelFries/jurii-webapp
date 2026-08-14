/**
 * Planos e assinatura do licenciamento, espelho do model do app
 * (jurii/lib/models/law_firm_license.dart).
 *
 * As REGRAS DE EXIBIÇÃO são as mesmas de propósito: o desconto anual é
 * CALCULADO dos preços (nunca escrito à mão), o ciclo anual mostra só o
 * equivalente mensal, e preço se escreve sem centavos quando é redondo.
 * Divergir daqui do app significaria dois preços diferentes para o mesmo
 * plano dependendo de onde a pessoa olha. O teste de sincronia trava os
 * números de produção (essencial 148800, escritorio 348000, banca 696000,
 * todos arredondando para 17%).
 */

export type CicloDeCobranca = "monthly" | "annual";

export type StatusDaAssinatura = "trialing" | "active" | "past_due" | "canceled";

export interface Plano {
  code: string;
  name: string;
  /** Nulo = sem teto (reservado para negociação direta). */
  maxLawyers: number | null;
  monthlyPriceCents: number;
  /** Preço do ano inteiro, pago de uma vez. Nulo = plano sem opção anual. */
  annualPriceCents: number | null;
  sortOrder: number;
}

export interface Assinatura {
  id: string;
  planCode: string;
  status: StatusDaAssinatura;
  billingCycle: CicloDeCobranca;
  trialEndsAt: Date | null;
  lawFirmId: string | null;
  plano: Plano | null;
}

/* ------------------------------------------------------------------ */
/* Parse das linhas do banco                                           */
/* ------------------------------------------------------------------ */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Linha = Record<string, any>;

export function planoDaLinha(row: Linha): Plano {
  return {
    code: String(row.code),
    name: String(row.name ?? ""),
    maxLawyers: row.max_lawyers == null ? null : Number(row.max_lawyers),
    monthlyPriceCents: Number(row.monthly_price_cents ?? 0),
    annualPriceCents:
      row.annual_price_cents == null ? null : Number(row.annual_price_cents),
    sortOrder: Number(row.sort_order ?? 0),
  };
}

export function assinaturaDaLinha(row: Linha): Assinatura {
  const planoJunto = row.law_firm_license_plans;
  return {
    id: String(row.id),
    planCode: String(row.plan_code ?? ""),
    status: statusDoValor(row.status),
    billingCycle: row.billing_cycle === "annual" ? "annual" : "monthly",
    trialEndsAt: row.trial_ends_at ? new Date(String(row.trial_ends_at)) : null,
    lawFirmId: row.law_firm_id == null ? null : String(row.law_firm_id),
    plano:
      planoJunto && typeof planoJunto === "object"
        ? planoDaLinha(planoJunto as Linha)
        : null,
  };
}

function statusDoValor(valor: unknown): StatusDaAssinatura {
  switch (valor) {
    case "active":
      return "active";
    case "past_due":
      return "past_due";
    case "canceled":
      return "canceled";
    default:
      return "trialing";
  }
}

/* ------------------------------------------------------------------ */
/* Exibição (mesmas regras do app)                                     */
/* ------------------------------------------------------------------ */

/** "R$ 349" sem centavos quando o preço é redondo, como preço de plano se
 * escreve no Brasil; "R$ 1.234,50" quando não é. */
export function formataPreco(cents: number): string {
  const reais = Math.trunc(cents / 100);
  const centavos = cents % 100;
  const inteiro = new Intl.NumberFormat("pt-BR").format(reais);
  return centavos === 0
    ? `R$ ${inteiro}`
    : `R$ ${inteiro},${String(centavos).padStart(2, "0")}`;
}

/** O equivalente MENSAL do plano anual, a ÚNICA forma de preço que a tela
 * mostra no ciclo anual. O total do ano não aparece de propósito: dois
 * números competindo no mesmo cartão fazem a pessoa parar para comparar em
 * vez de escolher. */
export function precoMensalDoAnual(plano: Plano): string | null {
  if (plano.annualPriceCents == null) return null;
  return formataPreco(Math.round(plano.annualPriceCents / 12));
}

/** Desconto do anual sobre 12 mensalidades, em % inteiro. Calculado, não
 * declarado: se o preço mudar na tabela, o selo acompanha sozinho. */
export function descontoAnualPercent(plano: Plano): number | null {
  if (plano.annualPriceCents == null || plano.monthlyPriceCents === 0) {
    return null;
  }
  const cheio = plano.monthlyPriceCents * 12;
  return Math.round(100 - (plano.annualPriceCents * 100) / cheio);
}

export function rotuloDaEquipe(plano: Plano): string {
  if (plano.maxLawyers == null) return "Sem limite de advogados";
  if (plano.maxLawyers === 1) return "1 advogado";
  return `Até ${plano.maxLawyers} advogados`;
}

/** "~R$ 35 por advogado": o argumento de que crescer não é punido. */
export function rotuloPorAdvogado(plano: Plano): string | null {
  if (!plano.maxLawyers) return null;
  const porAdvogado = Math.round(plano.monthlyPriceCents / plano.maxLawyers / 100);
  return `~R$ ${porAdvogado} por advogado`;
}

/**
 * A assinatura dá passagem? Espelho de `assinatura_esta_viva` no banco
 * (migration 20260906120000).
 *
 * A DATA É A METADE QUE FALTAVA: antes a regra olhava só o status, e
 * 'trialing' nunca vencia. `past_due` fica de fora de propósito, senão o teste
 * vencido viraria past_due e seguiria valendo.
 */
export function assinaturaViva(assinatura: Assinatura, agora: Date): boolean {
  return (
    assinatura.status === "active" ||
    (assinatura.status === "trialing" && !testeVencido(assinatura, agora))
  );
}

/**
 * O teste acabou de verdade.
 *
 * Teste sem data de fim conta como vencido, e não como eterno: entre errar
 * para o lado de cobrar e errar para o lado de liberar para sempre, este é o
 * lado seguro. Mesma escolha da `assinatura_esta_viva`.
 */
export function testeVencido(assinatura: Assinatura, agora: Date): boolean {
  return (
    assinatura.status === "trialing" &&
    (assinatura.trialEndsAt === null ||
      assinatura.trialEndsAt.getTime() <= agora.getTime())
  );
}

/** Dias restantes do teste, nunca negativo: "faltam -3 dias" não é frase. */
export function diasRestantesDeTeste(
  assinatura: Assinatura,
  agora: Date,
): number {
  if (assinatura.status !== "trialing" || !assinatura.trialEndsAt) return 0;
  const dias = Math.floor(
    (assinatura.trialEndsAt.getTime() - agora.getTime()) / 86_400_000,
  );
  return dias < 0 ? 0 : dias;
}

/** "Banca · anual · teste grátis, 23 dias restantes". O ciclo só aparece
 * quando é anual, porque mensal é o comum.
 *
 * TESTE VENCIDO TEM NOME PRÓPRIO. Enquanto vencer não tinha consequência, o
 * rótulo podia seguir dizendo "teste grátis"; agora que o escritório para de
 * convidar advogados (20260906120000), repetir "teste grátis" seria o rótulo
 * mentindo no exato momento em que a pessoa precisa entender o que mudou. */
export function rotuloDeStatus(assinatura: Assinatura, agora: Date): string {
  const base = assinatura.plano?.name || assinatura.planCode;
  const nome =
    assinatura.billingCycle === "annual" ? `${base} · anual` : base;
  switch (assinatura.status) {
    case "trialing": {
      if (testeVencido(assinatura, agora)) return `${nome} · teste encerrado`;
      const dias = diasRestantesDeTeste(assinatura, agora);
      const rotulo =
        dias === 0
          ? "último dia"
          : dias === 1
            ? "1 dia restante"
            : `${dias} dias restantes`;
      return `${nome} · teste grátis, ${rotulo}`;
    }
    case "active":
      return `${nome} · ativo`;
    case "past_due":
      return `${nome} · pagamento pendente`;
    case "canceled":
      return `${nome} · cancelado`;
  }
}

/* ------------------------------------------------------------------ */
/* Erros da RPC choose_law_firm_plan, na língua de quem lê             */
/* ------------------------------------------------------------------ */

export function traduzErroDeEscolhaDePlano(mensagem: string): string {
  if (mensagem.includes("Not authenticated")) {
    return "Sua sessão expirou. Entre de novo.";
  }
  if (mensagem.includes("Unknown plan")) {
    return "Esse plano não existe mais. Recarregue a página.";
  }
  if (mensagem.includes("Unknown billing cycle")) {
    return "Ciclo de cobrança inválido. Recarregue a página.";
  }
  if (mensagem.includes("Plan has no annual price")) {
    return "Esse plano não tem opção anual.";
  }
  if (mensagem.includes("Firm already has a subscription")) {
    return "O escritório já tem uma assinatura ativa.";
  }
  if (mensagem.includes("Plan change requires billing update")) {
    // Trocar de plano depois que a cobrança começou mudaria o `plan_code` no
    // nosso banco sem mudar o valor no provedor: o escritório usaria o plano
    // caro pagando o barato, ou pagaria o caro tendo pedido o barato.
    // Enquanto a troca não souber conversar com o provedor, ela não acontece.
    return "Sua assinatura já está em cobrança. Fale com a gente para trocar de plano sem cobrar errado.";
  }
  return "Não foi possível trocar o plano. Tente de novo em instantes.";
}
