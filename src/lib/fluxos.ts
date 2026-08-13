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

export type PapelNoEscritorio =
  | "owner"
  | "admin"
  | "lawyer"
  | "secretary"
  | "intern";

/**
 * A ORDEM importa: é ela que decide o papel principal (o primeiro), e é a
 * mesma de FirmRole.orderedValues no app. Estagiário existe no banco e no
 * app, e faltava aqui: um estagiário era lido como advogado.
 */
export const papeisEmOrdem: PapelNoEscritorio[] = [
  "owner",
  "admin",
  "lawyer",
  "secretary",
  "intern",
];

/**
 * Normalização do app (FirmRole.normalize): sem duplicata, na ordem
 * canônica, e lista vazia vira ["lawyer"], porque o servidor recusa
 * conjunto vazio ("At least one firm role is required").
 */
export function normalizaPapeis(
  papeis: Iterable<PapelNoEscritorio>,
): PapelNoEscritorio[] {
  const unicos = new Set(papeis);
  const ordenados = papeisEmOrdem.filter((papel) => unicos.has(papel));
  return ordenados.length > 0 ? ordenados : ["lawyer"];
}

/** O papel principal é o primeiro da ordem canônica. */
export function papelPrincipal(
  papeis: Iterable<PapelNoEscritorio>,
): PapelNoEscritorio {
  return normalizaPapeis(papeis)[0];
}

export interface FluxosDoUsuario {
  advogadoAprovado: boolean;
  /**
   * Funcionário da JURII, que revisa as verificações de advogados e
   * escritórios. NÃO tem relação com papel dentro de escritório: aquilo
   * vive em law_firm_members (sócio, admin, advogado, secretária,
   * estagiário) e é de outra empresa. Aqui é gente da casa.
   */
  equipeJurii: boolean;
  escritorio: {
    id: string;
    nome: string;
    papeis: PapelNoEscritorio[];
  } | null;
}

export async function fluxosDoUsuario(
  supabase: SupabaseClient,
): Promise<FluxosDoUsuario> {
  const [verificacao, vinculo, equipe] = await Promise.all([
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
    // No MESMO lote: não custa uma ida à rede nova. E degrada para false
    // se a função ainda não existir no ambiente (migration não aplicada),
    // porque um erro aqui não pode derrubar o login de ninguém.
    supabase.rpc("is_jurii_staff"),
  ]);
  const linhaDeVinculo = vinculo.data;
  const firma = linhaDeVinculo?.law_firms as
    | { id: string; name: string }
    | { id: string; name: string }[]
    | null
    | undefined;
  const firmaUnica = Array.isArray(firma) ? firma[0] : firma;

  return {
    equipeJurii: equipe.data === true,
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
  const validos: PapelNoEscritorio[] = papeisEmOrdem;

  if (Array.isArray(roles)) {
    const lidos = roles.filter((papel): papel is PapelNoEscritorio =>
      validos.includes(papel as PapelNoEscritorio),
    );
    if (lidos.length > 0) return normalizaPapeis(lidos);
  }
  if (typeof papelLegado === "string" && validos.includes(papelLegado as PapelNoEscritorio)) {
    return [papelLegado as PapelNoEscritorio];
  }
  return ["lawyer"];
}

/**
 * Onde a pessoa CAI ao entrar. O webapp existe para o profissional
 * trabalhar no computador, então escritório vem primeiro, advogado depois,
 * e o fluxo do cliente é a casa de quem não é profissional. Todos os
 * fluxos continuam alcançáveis pela troca no topo.
 */
/**
 * A casa da pessoa: escritório primeiro, advogado depois. Quem não tem
 * papel profissional vai para a porta que explica que a área do cliente
 * é no aplicativo (o webapp virou ferramenta de trabalho).
 */
export function destinoInicial(fluxos: FluxosDoUsuario): string {
  if (fluxos.escritorio !== null) return "/escritorio";
  if (fluxos.advogadoAprovado) return "/advogado";
  // Funcionário da Jurii sem papel profissional cai na REVISÃO, e não na
  // porta que manda baixar o aplicativo: a área dele é esta.
  if (fluxos.equipeJurii) return "/revisao";
  return "/cliente";
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
    case "intern":
      return "Estagiário";
  }
}
