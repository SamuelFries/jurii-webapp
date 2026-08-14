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
  /** Convite de equipe: o vínculo a responder (metadata.membership_id). */
  membershipId: string | null;
  /** Preenchido pelo servidor DEPOIS de respondido (accepted/declined). */
  conviteStatus: string | null;
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
    membershipId:
      metadata.membership_id == null ? null : String(metadata.membership_id),
    conviteStatus:
      metadata.invite_status == null ? null : String(metadata.invite_status),
  };
}

/**
 * Convite de equipe ainda sem resposta, o MESMO predicado do app
 * (isPendingTeamInvite): tipo team_invite, com vínculo, e sem
 * invite_status, que é o carimbo que o servidor grava ao responder. Depois
 * de respondido os botões somem sozinhos na próxima renderização.
 */
export function conviteDeEquipePendente(notificacao: Notificacao): boolean {
  return (
    notificacao.tipo === "team_invite" &&
    notificacao.membershipId !== null &&
    notificacao.conviteStatus === null
  );
}

/**
 * Para onde o toque leva, no fluxo em que a pessoa está. Nulo = notificação
 * informativa, sem destino (não vira link morto).
 */
export function destinoDaNotificacao(
  notificacao: Notificacao,
  fluxo: "advogado" | "escritorio",
  /**
   * DE QUAL escritório, porque a rota do fluxo carrega o id
   * (`/escritorio/{id}/casos/{caso}`). Nulo no fluxo do advogado, que não
   * tem escritório na rota. Nulo NO fluxo do escritório significa que não
   * se sabe de qual banca é a notificação: aí não há destino, porque um
   * caminho sem id só levaria a pessoa para a guarda e de volta.
   */
  escritorioId: string | null,
): string | null {
  // O fluxo "cliente" saiu do TIPO, e não só do uso: com o recorte
  // profissional as rotas /conversas e /casos do cliente não existem, então
  // um destino de cliente seria link morto. Tirar do tipo faz o compilador
  // recusar quem tentar reintroduzir.
  if (fluxo === "escritorio" && escritorioId === null) return null;
  const base =
    fluxo === "advogado" ? "/advogado" : `/escritorio/${escritorioId}`;

  // Escritório nunca abre conversa a partir da notificação (regra do app).
  if (fluxo !== "escritorio" && notificacao.conversaId !== null) {
    return `${base}/conversas/${notificacao.conversaId}`;
  }
  if (notificacao.casoId !== null) {
    return `${base}/casos/${notificacao.casoId}`;
  }
  return null;
}
