import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Quais fluxos a pessoa tem, com as MESMAS regras do app (main.dart):
 *
 *  - Cliente: todo mundo logado.
 *  - Advogado: verificação mais recente APROVADA (lawyer_verifications).
 *  - Escritório: vínculo ATIVO em law_firm_members; membro de 2+ escritórios
 *    entra no mais antigo, a mesma ordenação estável do app.
 *
 * A autoridade continua sendo a RLS: isto decide o que a navegação MOSTRA,
 * nunca o que o banco entrega. Regra que só existe na tela não é portão.
 */

export type PapelNoEscritorio = "owner" | "admin" | "secretary" | "lawyer";

export interface FluxosDoUsuario {
  advogadoAprovado: boolean;
  escritorio: {
    id: string;
    nome: string;
    papeis: PapelNoEscritorio[];
  } | null;
}

export async function fluxosDoUsuario(
  supabase: SupabaseClient,
): Promise<FluxosDoUsuario> {
  const [verificacao, vinculo] = await Promise.all([
    supabase
      .from("lawyer_verifications")
      .select("status")
      .order("submitted_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("law_firm_members")
      .select("law_firm_id, roles, member_role, role, status, law_firms(id, name)")
      .eq("status", "active")
      .order("joined_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  const linhaDeVinculo = vinculo.data;
  const firma = linhaDeVinculo?.law_firms as
    | { id: string; name: string }
    | { id: string; name: string }[]
    | null
    | undefined;
  const firmaUnica = Array.isArray(firma) ? firma[0] : firma;

  return {
    advogadoAprovado: verificacao.data?.status === "approved",
    escritorio:
      linhaDeVinculo && firmaUnica
        ? {
            id: firmaUnica.id,
            nome: firmaUnica.name,
            papeis: papeisDaLinha(
              linhaDeVinculo.roles,
              linhaDeVinculo.member_role ?? linhaDeVinculo.role,
            ),
          }
        : null,
  };
}

/** O banco tem duas gerações de coluna: `roles` (array) e as antigas
 * `member_role`/`role` (texto). A leitura aceita as duas, igual ao app. */
export function papeisDaLinha(
  roles: unknown,
  papelLegado: unknown,
): PapelNoEscritorio[] {
  const validos: PapelNoEscritorio[] = ["owner", "admin", "secretary", "lawyer"];

  if (Array.isArray(roles)) {
    const lidos = roles.filter((papel): papel is PapelNoEscritorio =>
      validos.includes(papel as PapelNoEscritorio),
    );
    if (lidos.length > 0) return lidos;
  }
  if (typeof papelLegado === "string" && validos.includes(papelLegado as PapelNoEscritorio)) {
    return [papelLegado as PapelNoEscritorio];
  }
  return ["lawyer"];
}

export function rotuloDoPapel(papel: PapelNoEscritorio): string {
  switch (papel) {
    case "owner":
      return "Sócio";
    case "admin":
      return "Admin";
    case "secretary":
      return "Secretária";
    case "lawyer":
      return "Advogado";
  }
}
