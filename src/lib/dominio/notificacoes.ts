/**
 * Notificações, espelho do NotificationRepository e do NotificationRouter
 * do app: a linha vem de `notifications` (RLS por destinatário), o destino
 * do toque mora no metadata, e o ESCOPO do escritório nunca abre conversa,
 * só caso, a mesma regra do app (o chat do painel do escritório tem
 * limites próprios; abrir pela notificação os reintroduziria).
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Linha = Record<string, any>;

export type EscopoDeNotificacao = "client" | "lawyer" | "firm";

export interface Notificacao {
  id: string;
  titulo: string;
  corpo: string;
  tipo: string;
  lida: boolean;
  criadaEm: Date | null;
  conversaId: string | null;
  casoId: string | null;
}

export function notificacaoDaLinha(row: Linha): Notificacao {
  const metadata = (row.metadata ?? {}) as Linha;
  return {
    id: String(row.id),
    titulo: String(row.title ?? ""),
    corpo: String(row.body ?? ""),
    tipo: String(row.type ?? ""),
    lida: row.read_at != null,
    criadaEm: row.created_at ? new Date(String(row.created_at)) : null,
    conversaId:
      metadata.conversation_id == null
        ? null
        : String(metadata.conversation_id),
    casoId: metadata.case_id == null ? null : String(metadata.case_id),
  };
}

/**
 * Para onde o toque leva, no fluxo em que a pessoa está. Nulo = notificação
 * informativa, sem destino (não vira link morto).
 */
export function destinoDaNotificacao(
  notificacao: Notificacao,
  fluxo: "cliente" | "advogado" | "escritorio",
): string | null {
  const base =
    fluxo === "cliente" ? "" : fluxo === "advogado" ? "/advogado" : "/escritorio";

  // Escritório nunca abre conversa a partir da notificação (regra do app).
  if (fluxo !== "escritorio" && notificacao.conversaId !== null) {
    return `${base}/conversas/${notificacao.conversaId}`;
  }
  if (notificacao.casoId !== null) {
    return `${base}/casos/${notificacao.casoId}`;
  }
  return null;
}
