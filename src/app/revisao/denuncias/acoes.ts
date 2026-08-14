"use server";

import { redirect } from "next/navigation";

import { contextoLogado } from "@/lib/contexto";

/**
 * Decidir uma denúncia.
 *
 * A autoridade é do banco: review_user_report cobra jurii_staff, exige nota
 * e só aceita as duas saídas que a coluna `status` sempre previu. Aqui só
 * traduzimos a recusa em mensagem, como no resto do painel.
 */
export async function decidirDenuncia(dados: FormData): Promise<void> {
  const contexto = await contextoLogado();
  const { error } = await contexto.supabase.rpc("review_user_report", {
    report_id_value: String(dados.get("denuncia") ?? ""),
    decision_value: String(dados.get("decisao") ?? ""),
    note_value: String(dados.get("nota") ?? ""),
  });

  if (error) {
    const mensagem = error.message.includes("Review note is required")
      ? "Escreva o que foi feito antes de decidir."
      : error.message.includes("already reviewed")
        ? "Esta denúncia já tinha sido decidida."
        : "Não foi possível registrar a decisão agora.";
    redirect(`/revisao/denuncias?erro=${encodeURIComponent(mensagem)}`);
  }

  redirect("/revisao/denuncias?ok=decidida");
}
