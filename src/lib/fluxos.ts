import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Quais fluxos a pessoa tem, com as MESMAS regras do app (main.dart):
 *
 *  - Cliente: todo mundo logado.
 *  - Advogado: verificação mais recente APROVADA (lawyer_verifications).
 *  - Escritório: TODOS os vínculos ativos em law_firm_members, cada um com o
 *    seu cargo.
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

/**
 * UM VÍNCULO: a pessoa neste escritório, com o cargo DELA aqui.
 *
 * O cargo é do vínculo e não da pessoa: quem é sócio numa banca pode ser
 * estagiário em outra, e as duas coisas são verdade ao mesmo tempo.
 */
export interface VinculoDeEscritorio {
  id: string;
  nome: string;
  iniciais: string;
  papeis: PapelNoEscritorio[];
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
  /**
   * TODOS os vínculos ativos, na ordem estável em que a pessoa entrou.
   *
   * Era um objeto ou null, resolvido por `order by joined_at limit 1`, e o
   * comentário de então já dizia o que faltava: "até existir um seletor de
   * escritório". O segundo escritório simplesmente não existia para o
   * webapp: sem rota, sem lateral, sem jeito de abrir.
   */
  escritorios: VinculoDeEscritorio[];
}

export async function fluxosDoUsuario(
  supabase: SupabaseClient,
): Promise<FluxosDoUsuario> {
  const [verificacao, vinculos, equipe] = await Promise.all([
    supabase
      .from("lawyer_verifications")
      .select("status")
      .order("submitted_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    // PELA RPC, e não por select direto. A policy law_firm_members_read_related
    // entrega também as linhas dos COLEGAS (ela existe para montar a lista da
    // equipe), então o select antigo, sem filtro de profile_id e com
    // `order by joined_at limit 1`, devolvia a linha do sócio para a
    // secretária: a tela lhe dava a interface de sócio. Isso acontecia em
    // produção sem ninguém ter dois escritórios.
    supabase.rpc("fetch_law_firm_memberships"),
    // No MESMO lote: não custa uma ida à rede nova. E degrada para false
    // se a função ainda não existir no ambiente (migration não aplicada),
    // porque um erro aqui não pode derrubar o login de ninguém.
    supabase.rpc("is_jurii_staff"),
  ]);

  const linhas = ((vinculos.data as unknown[]) ?? []) as Record<
    string,
    unknown
  >[];

  return {
    equipeJurii: equipe.data === true,
    advogadoAprovado: verificacao.data?.status === "approved",
    escritorios: linhas.map((linha) => ({
      id: String(linha.law_firm_id),
      nome: String(linha.law_firm_name ?? "Escritório"),
      iniciais: String(linha.law_firm_initials ?? "ES"),
      papeis: papeisDaLinha(linha.roles, linha.primary_role),
    })),
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
 * O vínculo com um escritório, ou null.
 *
 * É a única forma de resolver um id de escritório para papéis, e a razão de
 * ela existir é a segurança: o id chega da ROTA, isto é, do cliente. Sem
 * conferir contra a lista de vínculos, trocar o id na URL trocaria de
 * escritório. O banco recusaria as escritas, mas a tela mostraria a casa de
 * outra pessoa.
 */
export function vinculoCom(
  fluxos: FluxosDoUsuario,
  escritorioId: string | null | undefined,
): VinculoDeEscritorio | null {
  if (escritorioId == null || escritorioId === "") return null;
  return (
    fluxos.escritorios.find((vinculo) => vinculo.id === escritorioId) ?? null
  );
}

/**
 * Qual escritório abrir quando ninguém disse qual.
 *
 * A preferência guardada vale se ainda for um vínculo ATIVO; se o vínculo
 * caiu (saiu da banca, foi desativado), cai no primeiro da lista em vez de
 * insistir num contexto morto. É a regra 12 do pedido.
 */
export function escritorioPadrao(
  fluxos: FluxosDoUsuario,
  preferido: string | null | undefined,
): VinculoDeEscritorio | null {
  return vinculoCom(fluxos, preferido) ?? fluxos.escritorios[0] ?? null;
}

/**
 * Onde a pessoa CAI ao entrar. O webapp existe para o profissional
 * trabalhar no computador, então escritório vem primeiro, advogado depois,
 * e o fluxo do cliente é a casa de quem não é profissional. Todos os
 * fluxos continuam alcançáveis pela troca no rodapé da lateral.
 */
export function destinoInicial(
  fluxos: FluxosDoUsuario,
  preferido?: string | null,
): string {
  const escritorio = escritorioPadrao(fluxos, preferido);
  if (escritorio !== null) return `/escritorio/${escritorio.id}`;
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

/** Gestores editam cadastro, perfil e equipe; o resto trabalha. */
export function ehGestor(vinculo: VinculoDeEscritorio): boolean {
  return vinculo.papeis.some((papel) => papel === "owner" || papel === "admin");
}

/**
 * A primeira banca em que a pessoa é SÓCIA, ou null.
 *
 * Serve para as telas de fora do segmento saberem para onde mandar quem já
 * tem banca. Não é mais a régua da cobrança: desde que a licença passou a ser
 * por escritório, quem decide o que se pode contratar é a licença não gasta,
 * e não o cargo.
 *
 * Devolve a PRIMEIRA quando há mais de uma, o que basta para o uso atual
 * (encaminhar para uma rota que existe). Se um dia a tela precisar escolher
 * entre duas bancas, o certo é perguntar, não adivinhar aqui.
 */
export function escritorioDoSocio(
  fluxos: FluxosDoUsuario,
): VinculoDeEscritorio | null {
  return (
    fluxos.escritorios.find((vinculo) => vinculo.papeis.includes("owner")) ??
    null
  );
}
