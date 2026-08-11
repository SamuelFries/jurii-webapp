"use server";

import { redirect } from "next/navigation";

import { clienteDoServidor } from "@/lib/supabase/servidor";

/**
 * As mutações de notificação, iguais às do app: marcar uma, marcar todas do
 * escopo, apagar. A RLS garante que só o destinatário alcança as linhas.
 */

function caminhoSeguro(bruto: FormDataEntryValue | null, padrao: string): string {
  const caminho = String(bruto ?? padrao);
  return caminho.startsWith("/") && !caminho.startsWith("//") ? caminho : padrao;
}

/** Abrir é ler: marca e segue para o destino (conversa ou caso). */
export async function abrirNotificacao(dados: FormData): Promise<void> {
  const destino = caminhoSeguro(dados.get("destino"), "/notificacoes");
  const supabase = await clienteDoServidor();
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", String(dados.get("id") ?? ""))
    .filter("read_at", "is", null);
  redirect(destino);
}

export async function marcarComoLida(dados: FormData): Promise<void> {
  const voltar = caminhoSeguro(dados.get("voltar"), "/notificacoes");
  const supabase = await clienteDoServidor();
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", String(dados.get("id") ?? ""))
    .filter("read_at", "is", null);
  redirect(voltar);
}

export async function marcarTodasComoLidas(dados: FormData): Promise<void> {
  const voltar = caminhoSeguro(dados.get("voltar"), "/notificacoes");
  const escopo = String(dados.get("escopo") ?? "client");
  const lawFirmId = dados.get("escritorio");

  const supabase = await clienteDoServidor();
  let consulta = supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("scope", escopo)
    .filter("read_at", "is", null);
  if (escopo === "firm" && lawFirmId != null) {
    consulta = consulta.eq("law_firm_id", String(lawFirmId));
  }
  await consulta;
  redirect(voltar);
}

export async function apagarNotificacao(dados: FormData): Promise<void> {
  const voltar = caminhoSeguro(dados.get("voltar"), "/notificacoes");
  const supabase = await clienteDoServidor();
  await supabase
    .from("notifications")
    .delete()
    .eq("id", String(dados.get("id") ?? ""));
  redirect(voltar);
}

/**
 * Responder ao convite de equipe, MESMA RPC do app
 * (respond_to_law_firm_invite). Quem valida convite, assento e papel é o
 * servidor; aqui só se traduz a recusa mais comum. A notificação não é
 * marcada como lida à mão: o servidor carimba invite_status no metadata e
 * os botões somem sozinhos.
 */
export async function responderConviteDeEquipe(
  dados: FormData,
): Promise<void> {
  const voltar = caminhoSeguro(dados.get("voltar"), "/advogado/notificacoes");
  const aceitar = String(dados.get("resposta")) === "aceitar";

  const supabase = await clienteDoServidor();
  const { error } = await supabase.rpc("respond_to_law_firm_invite", {
    membership_id_value: String(dados.get("membership") ?? ""),
    accepted_value: aceitar,
  });

  if (error) {
    const mensagem = error.message.includes("seat")
      ? "O escritório está sem assentos livres. Peça ao responsável para revisar o plano."
      : "Não foi possível responder ao convite. Ele pode já ter sido respondido ou cancelado.";
    redirect(`${voltar}?erro=${encodeURIComponent(mensagem)}`);
  }
  redirect(`${voltar}?ok=${aceitar ? "convite-aceito" : "convite-recusado"}`);
}
