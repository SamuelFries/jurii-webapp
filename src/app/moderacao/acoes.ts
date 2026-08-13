"use server";

import { redirect } from "next/navigation";

import { caminhoInterno } from "@/lib/caminho-seguro";
import { clienteDoServidor } from "@/lib/supabase/servidor";

function volta(caminho: string, sufixo: string): never {
  const destino = caminhoInterno(caminho, "/");
  const separador = destino.includes("?") ? "&" : "?";
  redirect(`${destino}${separador}${sufixo}`);
}

export async function bloquearConversa(dados: FormData): Promise<void> {
  const voltar = String(dados.get("voltar") ?? "/");
  const supabase = await clienteDoServidor();
  const { error } = await supabase.rpc("block_conversation", {
    conversation_id_value: String(dados.get("conversa") ?? ""),
  });
  if (error) volta(voltar, `erro=${encodeURIComponent("Não foi possível bloquear.")}`);
  volta(voltar, "ok=bloqueada");
}

export async function desbloquearConversa(dados: FormData): Promise<void> {
  const voltar = String(dados.get("voltar") ?? "/");
  const supabase = await clienteDoServidor();
  const { error } = await supabase.rpc("unblock_conversation", {
    conversation_id_value: String(dados.get("conversa") ?? ""),
  });
  if (error) volta(voltar, `erro=${encodeURIComponent("Não foi possível desbloquear.")}`);
  volta(voltar, "ok=desbloqueada");
}

/** As razões são as MESMAS do app (report_reason.dart); valor fora da
 * lista vira 'outro' em vez de inventar categoria. */
const razoesValidas = new Set([
  "conteudo_abusivo",
  "golpe_ou_fraude",
  "falsa_identidade",
  "spam",
  "outro",
]);

export async function denunciarConversa(dados: FormData): Promise<void> {
  const voltar = String(dados.get("voltar") ?? "/");
  const razaoCrua = String(dados.get("razao") ?? "outro");
  const razao = razoesValidas.has(razaoCrua) ? razaoCrua : "outro";

  const supabase = await clienteDoServidor();
  const { error } = await supabase.rpc("report_conversation", {
    conversation_id_value: String(dados.get("conversa") ?? ""),
    reason_value: razao,
    details_value: String(dados.get("detalhes") ?? "").trim() || null,
    message_id_value: null,
  });
  if (error) {
    volta(voltar, `erro=${encodeURIComponent("Não foi possível enviar a denúncia.")}`);
  }
  volta(voltar, "ok=denunciada");
}
