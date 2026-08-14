import { cache } from "react";

import { redirect } from "next/navigation";
import type { SupabaseClient, User } from "@supabase/supabase-js";

import { escritorioPreferido } from "./escritorio-ativo";
import {
  destinoInicial,
  fluxosDoUsuario,
  vinculoCom,
  type FluxosDoUsuario,
  type VinculoDeEscritorio,
} from "./fluxos";
import { clienteDoServidor } from "./supabase/servidor";

export interface ContextoLogado {
  supabase: SupabaseClient;
  usuario: User;
  fluxos: FluxosDoUsuario;
}

/**
 * O contexto de toda página logada: sessão validada + fluxos disponíveis.
 * O middleware já barra sem sessão; aqui é a segunda tranca (e a primeira
 * para quem chegar por um caminho que o matcher não cobre).
 *
 * DUAS DECISÕES DE VELOCIDADE, e as duas valem em TODA navegação:
 *
 * 1. getUser e fluxos vão JUNTOS. Eram sequenciais, mas fluxosDoUsuario
 *    não usa o id: as consultas dele filtram pela RLS (auth.uid() dentro
 *    do banco). Esperar a validação do token para só então perguntar os
 *    fluxos custava uma ida à rede inteira, de graça. Sem sessão, as
 *    consultas voltam vazias e o redirect acontece igual.
 *
 * 2. cache() do React: dentro da MESMA requisição, layout e página
 *    compartilham a chamada. Sem isto, mover a casca para um layout
 *    dobraria o custo de autenticação em vez de reduzir.
 */
export const contextoLogado = cache(async function contextoLogado(): Promise<
  ContextoLogado
> {
  const supabase = await clienteDoServidor();
  const [
    {
      data: { user },
    },
    fluxos,
  ] = await Promise.all([supabase.auth.getUser(), fluxosDoUsuario(supabase)]);
  if (user === null) redirect("/entrar");

  return { supabase, usuario: user, fluxos };
});

/** Fluxo do advogado só para verificação APROVADA, a regra do app. */
export function exigeAdvogado(contexto: ContextoLogado): void {
  if (!contexto.fluxos.advogadoAprovado) redirect(destinoInicial(contexto.fluxos));
}

/**
 * O vínculo com o escritório DA ROTA, ou redirect.
 *
 * É AQUI que mora a segurança do contexto ativo. O id chega da URL, isto é,
 * do cliente, e nunca é aceito por vir escrito: ele é procurado na lista de
 * vínculos que o BANCO devolveu para esta sessão. Trocar o id na barra de
 * endereço leva de volta para a casa da pessoa, não para o escritório dos
 * outros.
 *
 * Quem tem vínculo mas pediu o escritório errado vai para o dele; quem não
 * tem vínculo nenhum vai para o destino do fluxo que tiver.
 */
export function exigeEscritorio(
  contexto: ContextoLogado,
  escritorioId: string | null | undefined,
): VinculoDeEscritorio {
  const vinculo = vinculoCom(contexto.fluxos, escritorioId);
  if (vinculo === null) redirect(destinoInicial(contexto.fluxos));
  return vinculo;
}

/**
 * O mesmo, para SERVER ACTION: em vez de redirect, devolve null, porque
 * ação não tem para onde mandar antes de decidir a mensagem de erro.
 */
export function vinculoDaAcao(
  contexto: ContextoLogado,
  escritorioId: string | null | undefined,
): VinculoDeEscritorio | null {
  return vinculoCom(contexto.fluxos, escritorioId);
}

/** A preferência guardada, para resolver `/escritorio` sem id e o pós-login. */
export { escritorioPreferido };

/**
 * O cartão público mora no webapp, que é a mesa do profissional: quem não
 * tem papel nenhum não deve ver a barra lateral de trabalho (ela ofereceria
 * uma navegação que as próprias guardas recusam). Vai para a porta.
 */
export function exigeProfissional(contexto: ContextoLogado): void {
  if (
    contexto.fluxos.escritorios.length === 0 &&
    !contexto.fluxos.advogadoAprovado
  ) {
    redirect("/cliente");
  }
}
