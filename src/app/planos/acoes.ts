"use server";

import { redirect } from "next/navigation";

import { traduzErroDeEscolhaDePlano } from "@/lib/licenca";
import { clienteDoServidor } from "@/lib/supabase/servidor";

/**
 * Escolhe (ou troca) o plano pela MESMA RPC que o app usa,
 * choose_law_firm_plan: no primeiro uso ela cria o teste grátis de 30 dias;
 * nas trocas, o fim do teste não renova (o servidor garante). Nenhuma
 * escrita direta na tabela: a RLS não deixa, de propósito.
 */
export async function escolherPlano(dados: FormData): Promise<void> {
  const planCode = String(dados.get("plano") ?? "");
  const ciclo = dados.get("ciclo") === "annual" ? "annual" : "monthly";

  const supabase = await clienteDoServidor();
  const { error } = await supabase.rpc("choose_law_firm_plan", {
    plan_code_value: planCode,
    billing_cycle_value: ciclo,
  });

  if (error) {
    redirect(
      `/planos?erro=${encodeURIComponent(traduzErroDeEscolhaDePlano(error.message))}`,
    );
  }

  redirect("/assinatura");
}
