/**
 * As denúncias, do ponto de vista de quem decide.
 *
 * O que chega ao painel é uma FOTOGRAFIA: as 15 últimas mensagens daquela
 * conversa, copiadas no instante em que alguém denunciou. Não é uma janela
 * para a conversa, que continuaria crescendo depois da decisão, e não some
 * quando o denunciado apaga a própria mensagem.
 */

export interface MensagemDaDenuncia {
  id: string;
  autorId: string | null;
  autorTipo: string;
  corpo: string;
  apagada: boolean;
  criadaEmIso: string | null;
}

export interface Denuncia {
  id: string;
  motivo: string;
  detalhes: string | null;
  status: "open" | "reviewed" | "dismissed";
  criadaEmIso: string | null;
  quemDenunciouId: string | null;
  quemDenunciou: string;
  quemFoiDenunciado: string;
  denunciadoEhEscritorio: boolean;
  conversaId: string | null;
  mensagemDenunciadaId: string | null;
  mensagens: MensagemDaDenuncia[];
  /** Só no histórico. */
  decididaEmIso?: string | null;
  revisor?: string | null;
  nota?: string | null;
}

/**
 * Os cinco motivos são fechados no banco (check constraint), e a tradução
 * fica aqui porque o banco guarda o identificador, não o rótulo: mudar o
 * texto da tela não pode exigir migration.
 */
export const rotuloDoMotivo: Record<string, string> = {
  conteudo_abusivo: "Conteúdo abusivo",
  golpe_ou_fraude: "Golpe ou fraude",
  falsa_identidade: "Falsa identidade",
  spam: "Spam",
  outro: "Outro",
};

export function motivoLegivel(motivo: string): string {
  return rotuloDoMotivo[motivo] ?? motivo;
}

export function rotuloDaDecisaoDaDenuncia(status: string): string {
  switch (status) {
    case "reviewed":
      return "Providência tomada";
    case "dismissed":
      return "Sem providência";
    default:
      return "Aberta";
  }
}

/**
 * De que lado veio a mensagem, por IDENTIDADE e não por papel.
 *
 * A primeira versão deduzia do tipo do autor: cliente virava denunciante,
 * profissional virava denunciado. Está errado, e o erro apareceu na primeira
 * tela real: quem denuncia tanto pode ser o cliente quanto o profissional, e
 * quando foi a advogada quem denunciou, a fala DELA aparecia atribuída ao
 * cliente. Num painel de moderação, atribuir a frase à pessoa errada é o
 * pior defeito possível: pune o inocente.
 *
 * Agora compara o autor da mensagem com quem abriu a denúncia. Sem id de
 * autor (mensagem do sistema, ou fotografia antiga), devolve "indefinido" em
 * vez de chutar um lado.
 */
export function ladoDaMensagem(
  mensagem: MensagemDaDenuncia,
  quemDenunciouId: string | null,
): "denunciante" | "denunciado" | "indefinido" {
  if (mensagem.autorTipo === "system") return "indefinido";
  if (mensagem.autorId == null || quemDenunciouId == null) return "indefinido";
  return mensagem.autorId === quemDenunciouId ? "denunciante" : "denunciado";
}

/** A linha da fotografia, na leitura de quem revisa. */
export function mensagemDaLinha(linha: Record<string, unknown>): MensagemDaDenuncia {
  return {
    id: String(linha.id ?? ""),
    autorId: linha.autor_id == null ? null : String(linha.autor_id),
    autorTipo: String(linha.autor_tipo ?? ""),
    corpo: String(linha.corpo ?? ""),
    apagada: linha.apagada === true,
    criadaEmIso: linha.criada_em == null ? null : String(linha.criada_em),
  };
}

export function denunciaDaLinha(linha: Record<string, unknown>): Denuncia {
  const bruto = (linha.messages ?? []) as unknown[];
  const status = String(linha.status ?? "open");
  return {
    id: String(linha.id),
    motivo: String(linha.reason ?? "outro"),
    detalhes: linha.details == null ? null : String(linha.details),
    status:
      status === "reviewed" || status === "dismissed" ? status : "open",
    criadaEmIso: linha.created_at == null ? null : String(linha.created_at),
    quemDenunciouId:
      linha.reporter_profile_id == null
        ? null
        : String(linha.reporter_profile_id),
    quemDenunciou: String(linha.reporter_name ?? "Sem nome"),
    quemFoiDenunciado: String(linha.reported_name ?? "Sem nome"),
    denunciadoEhEscritorio: linha.reported_is_firm === true,
    conversaId: linha.conversation_id == null ? null : String(linha.conversation_id),
    mensagemDenunciadaId:
      linha.reported_message_id == null
        ? null
        : String(linha.reported_message_id),
    mensagens: bruto.map((item) =>
      mensagemDaLinha(item as Record<string, unknown>),
    ),
    decididaEmIso:
      linha.reviewed_at == null ? null : String(linha.reviewed_at),
    revisor: linha.reviewer_name == null ? null : String(linha.reviewer_name),
    nota: linha.review_note == null ? null : String(linha.review_note),
  };
}

/** Data e hora cheias: denúncia é registro, e registro sem quando não serve. */
export function quandoAconteceu(iso: string | null | undefined): string {
  if (iso == null) return "sem data";
  const data = new Date(iso);
  if (!Number.isFinite(data.getTime())) return "sem data";
  return data.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}
