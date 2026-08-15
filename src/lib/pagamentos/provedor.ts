import { asaas } from "./asaas";

/**
 * O provedor de pagamento, atrás de uma interface, porque a ESCOLHA do
 * provedor foi adiada de propósito (decisão de 10/08/2026).
 *
 * O que já está decidido e não depende do provedor:
 *
 *  1. O pagamento acontece AQUI, no webapp, nunca dentro do app: compra
 *     dentro do app entrega 30% para a Apple.
 *  2. Quem grava o resultado é o WEBHOOK, com a service_role, que vive
 *     somente nas variáveis de ambiente da Vercel. O navegador nunca
 *     escreve em law_firm_license_subscriptions: a RLS não deixa, e o
 *     webhook é o único caminho de status 'active'.
 *  3. O que o webhook fará, com qualquer provedor: validar a assinatura da
 *     chamada, achar a assinatura pelo id nos metadados da cobrança, e
 *     mover status (pago -> active, falha recorrente -> past_due,
 *     cancelamento -> canceled).
 *
 * O que a escolha do provedor decide: PIX e boleto com recorrência (o jeito
 * como escritório pequeno paga no Brasil), preço por transação, e o formato
 * da validação de webhook. Candidatos anotados: Stripe, Asaas, Pagar.me,
 * Iugu.
 *
 * Enquanto não há provedor, nada aqui FINGE que há: o checkout não é
 * oferecido nas telas e o endpoint de webhook responde 501. Botão de pagar
 * que não paga é o link morto que o app acabou de extirpar.
 */

export interface SessaoDeCheckout {
  /** Para onde mandar a pessoa para pagar. */
  url: string;
  /**
   * O id da assinatura NO PROVEDOR.
   *
   * Sobe junto com a URL porque quem chama precisa gravá-lo, e é a gravação
   * que arbitra a corrida: dois cliques simultâneos criam duas assinaturas lá,
   * e só uma consegue ocupar a coluna. Quem perde apaga a sua.
   */
  assinaturaNoProvedor: string;
}

/**
 * O que o checkout precisa saber.
 *
 * O VALOR e o DOCUMENTO vêm de fora, e não de uma consulta do provedor: ele
 * não tem por que alcançar o nosso banco. Quem sabe o preço é a tabela de
 * planos, e quem sabe o CPF é o perfil; o provedor recebe os dois já
 * resolvidos e cuida só de cobrar.
 */
export interface EntradaDeCheckout {
  assinaturaId: string;
  planCode: string;
  billingCycle: "monthly" | "annual";
  emailDoContratante: string;
  nomeDoContratante: string;
  /** CPF de quem contrata. O Asaas exige documento no cliente, e na hora da
   * compra o escritório ainda pode não existir (a licença vem antes da
   * banca), então quem responde pelo pagamento é a pessoa. */
  documentoDoContratante: string;
  valorEmCentavos: number;
  /** Quando a primeira cobrança vence: o fim do teste grátis. */
  primeiroVencimentoIso: string;
  descricao: string;
  /**
   * O id que JÁ gravamos para esta assinatura, quando existe.
   *
   * É a fonte de verdade da idempotência, e a busca por `externalReference`
   * ficou como recurso de quem veio de antes desta coluna existir: buscar é
   * uma foto do provedor num instante, e duas chamadas simultâneas tiram a
   * mesma foto vazia antes de qualquer uma criar.
   */
  assinaturaNoProvedorConhecida: string | null;
}

export interface ProvedorDePagamento {
  /** Nome curto para logs e telemetria ("stripe", "asaas", ...). */
  nome: string;

  /** Cria a sessão de pagamento de uma assinatura já existente (o teste
   * grátis criado por choose_law_firm_plan). */
  criarCheckout(entrada: EntradaDeCheckout): Promise<SessaoDeCheckout>;

  /** Valida e interpreta uma chamada de webhook. Lança se a assinatura da
   * chamada for inválida; devolve o efeito a aplicar. */
  processarWebhook(requisicao: Request): Promise<EfeitoDeWebhook>;

  /**
   * Apaga a assinatura que perdeu a corrida.
   *
   * Só é chamada para uma assinatura que ACABAMOS de criar e que o banco
   * recusou, ou seja, uma duplicata com zero pagamentos. Deixá-la de pé seria
   * uma segunda mensalidade recorrente na conta de quem clicou duas vezes.
   */
  descartarAssinaturaDuplicada(assinaturaNoProvedor: string): Promise<void>;

  /** A página de pagamento de uma assinatura que já existe no provedor. */
  linkDePagamentoDe(assinaturaNoProvedor: string): Promise<string>;
}

/**
 * A chamada não é do provedor.
 *
 * TEM TIPO PRÓPRIO porque a resposta certa depende disso, e é o oposto nos
 * dois casos: chamada forjada merece 401 e nenhuma reentrega, enquanto uma
 * falha nossa (rede caindo no meio da consulta, provedor fora do ar) precisa
 * de 500 para o provedor REENTREGAR. Enquanto o `catch` da rota tratava os
 * dois como 401, um timeout na consulta virava "recusado" para o Asaas, que
 * não tenta de novo: pagamento recebido e nunca aplicado.
 */
export class ChamadaNaoAutenticada extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "ChamadaNaoAutenticada";
  }
}

export type EfeitoDeWebhook =
  | { tipo: "ativar"; assinaturaId: string }
  | { tipo: "pagamento_pendente"; assinaturaId: string }
  | { tipo: "cancelar"; assinaturaId: string }
  | { tipo: "ignorar"; motivo: string };

/**
 * O provedor configurado, ou null enquanto a decisão não foi tomada.
 *
 * Quando a escolha acontecer, a implementação entra em
 * src/lib/pagamentos/<nome>.ts e este registro passa a devolvê-la a partir
 * da variável de ambiente PAGAMENTOS_PROVEDOR. As telas e o webhook já
 * perguntam aqui, então a troca não toca em página nenhuma.
 */
export function provedorConfigurado(): ProvedorDePagamento | null {
  // Ligado por variável de ambiente, e não por import direto: sem a chave
  // configurada o provedor não opera, e é melhor a tela dizer "não
  // configurado" do que estourar no meio de uma compra.
  if (process.env.PAGAMENTOS_PROVEDOR !== "asaas") return null;
  return asaas;
}
