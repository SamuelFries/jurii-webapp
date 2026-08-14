"use server";

import { redirect } from "next/navigation";

import { caminhoInterno } from "@/lib/caminho-seguro";
import { contextoLogado, vinculoDaAcao } from "@/lib/contexto";
import { destinoInicial } from "@/lib/fluxos";

/**
 * Indicar um advogado da equipe ao cliente, MESMA RPC do app
 * (recommend_lawyer_to_client). A indicação vira MENSAGEM no servidor, com
 * o retrato do advogado gravado na metadata; quem valida papel, equipe e
 * bloqueio é o banco. Conversa bloqueada recusa com a palavra do app.
 */
export async function indicarAdvogado(dados: FormData): Promise<void> {
  // O escritório vem do formulário, ou seja, é palavra do cliente. Só vale
  // depois de achado entre os vínculos que o banco devolveu para esta
  // sessão: quem forjar um id cai na própria casa, e daqui para a frente o
  // id usado é o do vínculo, nunca o do FormData.
  const contexto = await contextoLogado();
  const vinculo = vinculoDaAcao(
    contexto,
    String(dados.get("escritorio") ?? ""),
  );
  if (vinculo === null) redirect(destinoInicial(contexto.fluxos));

  const voltar = caminhoInterno(
    dados.get("voltar"),
    `/escritorio/${vinculo.id}/mensagens`,
  );
  const nota = String(dados.get("nota") ?? "").trim();

  // O cliente do contexto é o MESMO cliente de servidor, já criado para
  // conferir o vínculo: montar outro custaria uma segunda leitura de cookies.
  const { error } = await contexto.supabase.rpc("recommend_lawyer_to_client", {
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
