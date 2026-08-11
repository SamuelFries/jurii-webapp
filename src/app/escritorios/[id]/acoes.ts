"use server";

import { redirect } from "next/navigation";

import { clienteDoServidor } from "@/lib/supabase/servidor";

function volta(caminho: string, erro?: string): never {
  const destino =
    caminho.startsWith("/") && !caminho.startsWith("//") ? caminho : "/inicio";
  redirect(erro ? `${destino}?erro=${encodeURIComponent(erro)}` : destino);
}

/** Envia (ou substitui) a avaliação pela MESMA RPC do app; o servidor
 * decide a elegibilidade (só quem teve atendimento avalia). */
export async function enviarAvaliacao(dados: FormData): Promise<void> {
  const voltar = String(dados.get("voltar") ?? "/inicio");
  const nota = Number(dados.get("nota"));
  if (!Number.isInteger(nota) || nota < 1 || nota > 5) {
    volta(voltar, "Escolha uma nota de 1 a 5.");
  }

  const supabase = await clienteDoServidor();
  const { error } = await supabase.rpc("submit_professional_review", {
    target_type_value: String(dados.get("tipo") ?? "law_firm"),
    target_id_value: String(dados.get("id") ?? ""),
    rating_value: nota,
    comment_value: String(dados.get("comentario") ?? "").trim(),
  });

  if (error) {
    volta(
      voltar,
      "Não foi possível enviar a avaliação. Só quem teve atendimento pode avaliar.",
    );
  }
  volta(voltar);
}

export async function apagarAvaliacao(dados: FormData): Promise<void> {
  const voltar = String(dados.get("voltar") ?? "/inicio");
  const supabase = await clienteDoServidor();
  const { error } = await supabase.rpc("delete_professional_review", {
    target_type_value: String(dados.get("tipo") ?? "law_firm"),
    target_id_value: String(dados.get("id") ?? ""),
  });
  if (error) volta(voltar, "Não foi possível apagar a avaliação.");
  volta(voltar);
}
