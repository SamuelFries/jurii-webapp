/**
 * Conversas e mensagens, espelho do MessagingRepository do app.
 *
 * As linhas vêm de fetch_conversations_for_current_user, cujo RETURNS TABLE
 * é (id, type, title, initials, avatar_url, specialty, last_message,
 * last_message_at, law_firm_id, client_id, lawyer_id, unread_count). O
 * título já vem trocado pelo servidor conforme o escopo: no fluxo do
 * cliente é o escritório; nos outros, o cliente ou o colega.
 */

import { urlDoAvatar } from "../avatar";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Linha = Record<string, any>;

export type EscopoDeConversa = "client" | "lawyer" | "firmClient" | "firmTeam";

export interface Conversa {
  id: string;
  titulo: string;
  iniciais: string;
  avatarUrl: string | null;
  especialidade: string;
  ultimaMensagem: string;
  ultimaMensagemEm: Date | null;
  naoLidas: number;
}

export interface Mensagem {
  id: string;
  corpo: string;
  minha: boolean;
  criadaEm: Date;
  apagadaParaTodos: boolean;
}

export function conversaDaLinha(row: Linha): Conversa {
  return {
    id: String(row.id),
    titulo: String(row.title ?? ""),
    iniciais: String(row.initials ?? "?"),
    avatarUrl: urlDoAvatar(row.avatar_url == null ? null : String(row.avatar_url)),
    especialidade: String(row.specialty ?? ""),
    ultimaMensagem: String(row.last_message ?? ""),
    ultimaMensagemEm: row.last_message_at
      ? new Date(String(row.last_message_at))
      : null,
    naoLidas: Number(row.unread_count ?? 0),
  };
}

export function mensagemDaLinha(row: Linha, meuId: string): Mensagem {
  return {
    id: String(row.id),
    corpo: String(row.body ?? ""),
    minha: String(row.sender_id) === meuId,
    criadaEm: new Date(String(row.created_at)),
    apagadaParaTodos: row.deleted_for_all_at != null,
  };
}

/** "Hoje às 14:32", "Ontem às 09:10" ou "07/08 às 18:45". São Paulo é
 * UTC-3 estável (o Brasil aboliu o horário de verão em 2019). */
export function rotuloDeHorario(data: Date, agora: Date): string {
  const fusoMs = 3 * 3_600_000;
  const local = new Date(data.getTime() - fusoMs);
  const agoraLocal = new Date(agora.getTime() - fusoMs);

  const hora = `${String(local.getUTCHours()).padStart(2, "0")}:${String(
    local.getUTCMinutes(),
  ).padStart(2, "0")}`;

  const mesmoDia =
    local.getUTCFullYear() === agoraLocal.getUTCFullYear() &&
    local.getUTCMonth() === agoraLocal.getUTCMonth() &&
    local.getUTCDate() === agoraLocal.getUTCDate();
  if (mesmoDia) return `Hoje às ${hora}`;

  const ontem = new Date(agoraLocal.getTime() - 86_400_000);
  const foiOntem =
    local.getUTCFullYear() === ontem.getUTCFullYear() &&
    local.getUTCMonth() === ontem.getUTCMonth() &&
    local.getUTCDate() === ontem.getUTCDate();
  if (foiOntem) return `Ontem às ${hora}`;

  const dia = String(local.getUTCDate()).padStart(2, "0");
  const mes = String(local.getUTCMonth() + 1).padStart(2, "0");
  return `${dia}/${mes} às ${hora}`;
}

/**
 * Indicação de advogado dentro da conversa do escritório, espelho de
 * LawyerRecommendation.fromMetadata do app: retrato gravado pelo servidor
 * no momento da sugestão; nulo sem lawyer_id, porque sem advogado para
 * abrir conversa o card não teria o que fazer.
 */
export interface IndicacaoDeAdvogado {
  lawyerId: string;
  nome: string;
  oab: string;
  area: string | null;
  nota: string | null;
}

export function indicacaoDaMetadata(
  metadata: Record<string, unknown>,
): IndicacaoDeAdvogado | null {
  if (metadata.type !== "lawyer_recommendation") return null;
  if (metadata.lawyer_id == null) return null;
  return {
    lawyerId: String(metadata.lawyer_id),
    nome: String(metadata.lawyer_name ?? "Advogado"),
    oab: String(metadata.oab_label ?? "OAB verificada"),
    area: metadata.primary_area == null ? null : String(metadata.primary_area),
    nota:
      metadata.note == null || String(metadata.note).trim() === ""
        ? null
        : String(metadata.note),
  };
}

/**
 * Há quanto tempo algo espera, para a fila de "precisa de você".
 *
 * A pergunta que decide quem atender primeiro não é "a que horas chegou", é
 * "há quanto tempo está parado". Minutos até uma hora, horas até um dia,
 * dias depois. Nunca negativo: relógio adiantado no cliente vira "agora".
 */
export function esperaDesde(data: Date, agora: Date): string {
  const minutos = Math.max(0, Math.floor((agora.getTime() - data.getTime()) / 60_000));
  if (minutos < 1) return "agora";
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return horas === 1 ? "há 1 h" : `há ${horas} h`;
  const dias = Math.floor(horas / 24);
  return dias === 1 ? "há 1 dia" : `há ${dias} dias`;
}

/**
 * Espera longa demais para o padrão de atendimento: acima de 24 horas. É o
 * mesmo limiar do `urgent` do painel de casos (cliente falou por último e
 * ninguém respondeu em um dia), para a tela e o banco concordarem.
 */
export function esperandoHaMuito(data: Date, agora: Date): boolean {
  return agora.getTime() - data.getTime() >= 24 * 3_600_000;
}
