"use server";

import { redirect } from "next/navigation";

import { clienteDoServidor } from "@/lib/supabase/servidor";

function volta(sufixo: string): never {
  redirect(`/escritorio/perfil?${sufixo}`);
}

export async function salvarApresentacao(dados: FormData): Promise<void> {
  const supabase = await clienteDoServidor();
  const { error } = await supabase.rpc("update_law_firm_description", {
    law_firm_id_value: String(dados.get("escritorio") ?? ""),
    description_value: String(dados.get("descricao") ?? "").trim(),
  });
  if (error) {
    const mensagem = error.message.includes("Not allowed")
      ? "Apenas sócio e admin editam a apresentação."
      : "Não foi possível salvar a apresentação.";
    volta(`erro=${encodeURIComponent(mensagem)}`);
  }
  volta("ok=apresentacao");
}

/**
 * Grava o conjunto INTEIRO de horários numa tacada, como o app: substituir
 * tudo evita o cliente ver estado intermediário (sexta sumida por um
 * instante porque a tela ainda gravava). O payload chega como JSON num
 * campo oculto, montado pelo editor.
 */
export async function salvarHorarios(dados: FormData): Promise<void> {
  let horarios: unknown;
  try {
    horarios = JSON.parse(String(dados.get("horarios") ?? "[]"));
  } catch {
    volta(`erro=${encodeURIComponent("Horários inválidos. Recarregue e tente de novo.")}`);
  }

  const supabase = await clienteDoServidor();
  const { error } = await supabase.rpc("set_law_firm_business_hours", {
    law_firm_id_value: String(dados.get("escritorio") ?? ""),
    hours_value: horarios,
  });
  if (error) {
    const mensagem = error.message.includes("Not allowed")
      ? "Apenas sócio e admin editam os horários."
      : "O servidor recusou os horários. Confira os intervalos.";
    volta(`erro=${encodeURIComponent(mensagem)}`);
  }
  volta("ok=horarios");
}
