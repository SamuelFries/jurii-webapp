/**
 * As regras do chat que o app já tinha e o webapp precisava repetir:
 * o que dá para selecionar, o que dá para apagar e para quem, e como um
 * cartão de solicitação de caso é lido.
 *
 * Espelho de chat_message_deletion.dart e de ChatMessage.
 */

/** Espelha `interval '60 hours'` da migration 20260808120000. */
export const JANELA_APAGAR_PARA_TODOS_MS = 60 * 60 * 60 * 1000;

export interface MensagemParaRegra {
  minha: boolean;
  criadaEmIso: string | null;
  apagadaParaTodos: boolean;
  tipo: "texto" | "anexo" | "solicitacao_de_caso" | "indicacao";
}

/**
 * Mensagem que pode entrar no modo de seleção.
 *
 * Cartão de solicitação de caso e indicação de advogado ficam de fora: são
 * controles com botões próprios, não conversa. Deixá-los selecionáveis
 * misturaria "tocar para agir" com "tocar para marcar", que é o tipo de
 * ambiguidade que faz alguém recusar um caso sem querer.
 */
export function podeSelecionar(mensagem: MensagemParaRegra): boolean {
  return mensagem.tipo !== "solicitacao_de_caso" && mensagem.tipo !== "indicacao";
}

/** "Apagar para mim" vale para qualquer mensagem visível. */
export function podeApagarParaMim(mensagem: MensagemParaRegra): boolean {
  return podeSelecionar(mensagem);
}

/**
 * "Apagar para todos" exige as quatro condições que o servidor também
 * checa. A janela existe porque apagar para todos reescreve o que a outra
 * pessoa já leu, e aqui a conversa é registro da relação entre cliente e
 * advogado.
 */
export function podeApagarParaTodos(
  mensagem: MensagemParaRegra,
  agora: Date,
): boolean {
  if (!podeSelecionar(mensagem)) return false;
  if (!mensagem.minha) return false;
  if (mensagem.apagadaParaTodos) return false;
  if (mensagem.criadaEmIso === null) return false;

  const enviada = new Date(mensagem.criadaEmIso).getTime();
  if (!Number.isFinite(enviada)) return false;
  const decorrido = agora.getTime() - enviada;
  return decorrido >= 0 && decorrido <= JANELA_APAGAR_PARA_TODOS_MS;
}

/**
 * Todas as selecionadas podem ser apagadas para todos? A opção some quando
 * UMA da seleção não pode: meio-apagar seria pior que não oferecer.
 */
export function podeApagarSelecaoParaTodos(
  selecao: MensagemParaRegra[],
  agora: Date,
): boolean {
  if (selecao.length === 0) return false;
  return selecao.every((mensagem) => podeApagarParaTodos(mensagem, agora));
}

export type StatusDaSolicitacao = "pending" | "accepted" | "declined";

export interface SolicitacaoDeCaso {
  titulo: string;
  area: string;
  status: StatusDaSolicitacao;
}

/** O cartão de caso, espelho de ChatMessage: sem case_request_id não é um. */
export function solicitacaoDaMetadata(
  metadata: Record<string, unknown>,
): SolicitacaoDeCaso | null {
  if (metadata.type !== "case_request") return null;
  if (metadata.case_request_id == null) return null;
  const bruto = String(metadata.request_status ?? "pending");
  const status: StatusDaSolicitacao =
    bruto === "accepted" || bruto === "declined" ? bruto : "pending";
  return {
    titulo: String(metadata.title ?? "Solicitação de caso"),
    area: String(metadata.area ?? "Atendimento jurídico"),
    status,
  };
}

/** O texto do selo, nas palavras do app. */
export function rotuloDoStatusDaSolicitacao(
  status: StatusDaSolicitacao,
): string {
  switch (status) {
    case "accepted":
      return "Caso aceito";
    case "declined":
      return "Caso recusado";
    case "pending":
      return "Aguardando aceite do cliente";
  }
}
