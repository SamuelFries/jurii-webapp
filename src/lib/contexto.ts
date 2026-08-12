import { redirect } from "next/navigation";
import type { SupabaseClient, User } from "@supabase/supabase-js";

import {
  destinoInicial,
  fluxosDoUsuario,
  type FluxosDoUsuario,
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
 */
export async function contextoLogado(): Promise<ContextoLogado> {
  const supabase = await clienteDoServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user === null) redirect("/entrar");

  return { supabase, usuario: user, fluxos: await fluxosDoUsuario(supabase) };
}

/** Fluxo do advogado só para verificação APROVADA, a regra do app. */
export function exigeAdvogado(contexto: ContextoLogado): void {
  if (!contexto.fluxos.advogadoAprovado) redirect(destinoInicial(contexto.fluxos));
}

/** Fluxo do escritório só para vínculo ativo. */
export function exigeEscritorio(
  contexto: ContextoLogado,
): NonNullable<FluxosDoUsuario["escritorio"]> {
  const escritorio = contexto.fluxos.escritorio;
  if (escritorio === null) redirect(destinoInicial(contexto.fluxos));
  return escritorio;
}

/**
 * O cartão público mora no webapp, que é a mesa do profissional: quem não
 * tem papel nenhum não deve ver a barra lateral de trabalho (ela ofereceria
 * uma navegação que as próprias guardas recusam). Vai para a porta.
 */
export function exigeProfissional(contexto: ContextoLogado): void {
  if (
    contexto.fluxos.escritorio === null &&
    !contexto.fluxos.advogadoAprovado
  ) {
    redirect("/cliente");
  }
}
