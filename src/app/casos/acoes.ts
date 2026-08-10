"use server";

import { redirect } from "next/navigation";

import { clienteDoServidor } from "@/lib/supabase/servidor";

/** Aceita ou recusa a solicitação de caso, a MESMA RPC do app. */
export async function responderSolicitacao(dados: FormData): Promise<void> {
  const requestId = String(dados.get("id") ?? "");
  const aceitar = dados.get("aceitar") === "sim";

  const supabase = await clienteDoServidor();
  const { error } = await supabase.rpc("respond_to_case_request", {
    request_id_value: requestId,
    accepted_value: aceitar,
  });

  if (error) {
    redirect(
      `/casos?erro=${encodeURIComponent("Não foi possível responder à solicitação. Tente de novo.")}`,
    );
  }
  redirect("/casos");
}
