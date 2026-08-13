"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { clienteDoServidor } from "@/lib/supabase/servidor";

/**
 * A decisão sobre uma verificação.
 *
 * Nenhuma chave especial mora aqui: a chamada sai com a sessão da PESSOA,
 * e quem confere se ela é da equipe é o banco, dentro de
 * review_*_verification. Se um dia esta rota vazar, ela não entrega nada
 * que a mesma pessoa já não pudesse fazer.
 */
export async function decidirVerificacao(dados: FormData): Promise<void> {
  const tipo = String(dados.get("tipo") ?? "");
  const id = String(dados.get("id") ?? "");
  const aprovar = String(dados.get("decisao")) === "aprovar";
  const motivo = String(dados.get("motivo") ?? "").trim();

  if (!aprovar && motivo === "") {
    redirect(
      `/revisao?erro=${encodeURIComponent("Escreva o motivo da recusa: é o que a pessoa vai ler para corrigir.")}`,
    );
  }

  const supabase = await clienteDoServidor();
  const { error } = await supabase.rpc(
    tipo === "law_firm"
      ? "review_law_firm_verification"
      : "review_lawyer_verification",
    {
      verification_id_value: id,
      approve_value: aprovar,
      reason_value: aprovar ? null : motivo,
    },
  );

  if (error) {
    const mensagem = error.message.includes("Only Jurii staff")
      ? "Esta área é da equipe da Jurii."
      : error.message.includes("Rejection reason")
        ? "A recusa precisa de motivo."
        : "Não foi possível registrar a decisão. Tente de novo.";
    redirect(`/revisao?erro=${encodeURIComponent(mensagem)}`);
  }

  revalidatePath("/revisao");
  redirect(`/revisao?ok=${aprovar ? "aprovada" : "recusada"}`);
}
