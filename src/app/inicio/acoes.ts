"use server";

import { redirect } from "next/navigation";

import { clienteDoServidor } from "@/lib/supabase/servidor";

/**
 * Abre (ou cria) a conversa com o profissional, pelas MESMAS RPCs do app.
 * O servidor decide se já existe conversa e devolve o id dela: dois toques
 * em "Conversar" nunca criam duas conversas.
 */
export async function conversarComEscritorio(dados: FormData): Promise<void> {
  const lawFirmId = String(dados.get("id") ?? "");
  const supabase = await clienteDoServidor();

  const { data, error } = await supabase.rpc(
    "start_or_get_law_firm_conversation",
    { law_firm_id_value: lawFirmId, initial_message_value: "" },
  );

  if (error || data == null) {
    redirect(
      `/inicio?erro=${encodeURIComponent("Não foi possível abrir a conversa. Tente de novo.")}`,
    );
  }
  redirect(`/conversas/${String(data)}`);
}

export async function conversarComAdvogado(dados: FormData): Promise<void> {
  const lawyerId = String(dados.get("id") ?? "");
  const supabase = await clienteDoServidor();

  const { data, error } = await supabase.rpc(
    "start_or_get_lawyer_conversation",
    { lawyer_profile_id_value: lawyerId, initial_message_value: "" },
  );

  if (error || data == null) {
    redirect(
      `/inicio?erro=${encodeURIComponent("Não foi possível abrir a conversa. Tente de novo.")}`,
    );
  }
  redirect(`/conversas/${String(data)}`);
}
