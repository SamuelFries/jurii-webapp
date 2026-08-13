"use server";

import { redirect } from "next/navigation";

import { caminhoInterno } from "@/lib/caminho-seguro";
import { clienteDoServidor } from "@/lib/supabase/servidor";

/**
 * Indicar um advogado da equipe ao cliente, MESMA RPC do app
 * (recommend_lawyer_to_client). A indicação vira MENSAGEM no servidor, com
 * o retrato do advogado gravado na metadata; quem valida papel, equipe e
 * bloqueio é o banco. Conversa bloqueada recusa com a palavra do app.
 */
export async function indicarAdvogado(dados: FormData): Promise<void> {
  const voltar = caminhoInterno(
    dados.get("voltar"),
    "/escritorio/mensagens",
  );
  const nota = String(dados.get("nota") ?? "").trim();

  const supabase = await clienteDoServidor();
  const { error } = await supabase.rpc("recommend_lawyer_to_client", {
    conversation_id_value: String(dados.get("conversa") ?? ""),
    lawyer_profile_id_value: String(dados.get("advogado") ?? ""),
    note_value: nota === "" ? null : nota,
  });

  if (error) {
    const mensagem = error.message.includes("conversation_blocked")
      ? "Esta conversa está bloqueada."
      : "Não foi possível sugerir o advogado. Tente novamente.";
    const separador = voltar.includes("?") ? "&" : "?";
    redirect(`${voltar}${separador}erro=${encodeURIComponent(mensagem)}`);
  }
  const separador = voltar.includes("?") ? "&" : "?";
  redirect(`${voltar}${separador}ok=indicado`);
}
