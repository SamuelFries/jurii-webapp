/**
 * Avaliações de profissional, espelho do ReviewRepository do app:
 * fetch_professional_reviews devolve as avaliações mais a MINHA situação
 * (posso avaliar? qual foi a minha nota?) nas colunas can_review, is_mine,
 * my_rating e my_comment.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Linha = Record<string, any>;

export interface Avaliacao {
  id: string;
  autor: string;
  iniciais: string;
  nota: number;
  comentario: string;
  minha: boolean;
  criadaEm: Date | null;
}

export function avaliacaoDaLinha(row: Linha): Avaliacao {
  return {
    id: String(row.id),
    autor: String(row.reviewer_name ?? "Cliente"),
    iniciais: String(row.reviewer_initials ?? "?"),
    nota: Number(row.rating ?? 0),
    comentario: String(row.comment ?? ""),
    minha: row.is_mine === true,
    criadaEm: row.created_at ? new Date(String(row.created_at)) : null,
  };
}

/** "★★★★☆" para nota 4: barato e legível, como o app desenha. */
export function estrelas(nota: number): string {
  const cheias = Math.max(0, Math.min(5, Math.round(nota)));
  return "★".repeat(cheias) + "☆".repeat(5 - cheias);
}
