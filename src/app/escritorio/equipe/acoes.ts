"use server";

import { redirect } from "next/navigation";

import { clienteDoServidor } from "@/lib/supabase/servidor";

/**
 * Convida um advogado VERIFICADO pela OAB, a MESMA RPC do app. O servidor
 * decide tudo de novo: papel de quem convida (sócio/admin), limite de
 * vagas do plano, OAB válida e limite de tentativas.
 */
export async function convidarAdvogado(dados: FormData): Promise<void> {
  const uf = String(dados.get("uf") ?? "").trim().toUpperCase();
  const numero = String(dados.get("oab") ?? "").replace(/[^0-9A-Za-z]/g, "");

  if (uf.length !== 2 || numero === "") {
    redirect(
      `/escritorio/equipe?erro=${encodeURIComponent("Informe a UF e o número da OAB.")}`,
    );
  }

  const supabase = await clienteDoServidor();
  const { error } = await supabase.rpc("invite_verified_lawyer_to_law_firm", {
    law_firm_id_value: String(dados.get("escritorio") ?? ""),
    oab_state_value: uf,
    oab_number_value: numero,
  });

  if (error) {
    const mensagem = error.message.includes("seat limit")
      ? "O plano atual não tem mais vaga de advogado. Aumente o plano em Assinatura."
      : error.message.includes("Only active office owners")
        ? "Apenas sócio e admin convidam advogados."
        : error.message.includes("Invalid OAB")
          ? "Não achamos advogado verificado com essa OAB. Confira UF e número."
          : error.message.includes("Too many invite attempts")
            ? "Muitas tentativas de convite. Aguarde um pouco e tente de novo."
            : "Não foi possível convidar. Tente de novo.";
    redirect(`/escritorio/equipe?erro=${encodeURIComponent(mensagem)}`);
  }

  redirect("/escritorio/equipe?ok=convite");
}
