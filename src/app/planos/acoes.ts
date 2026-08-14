"use server";

import { redirect } from "next/navigation";

import { contextoLogado, vinculoDaAcao } from "@/lib/contexto";
import { destinoInicial, ehSocioEmAlguma } from "@/lib/fluxos";
import { traduzErroDeEscolhaDePlano } from "@/lib/licenca";

/**
 * Escolhe (ou troca) o plano pela MESMA RPC que o app usa,
 * choose_law_firm_plan: no primeiro uso ela cria o teste grátis de 30 dias;
 * nas trocas, o fim do teste não renova (o servidor garante). Nenhuma
 * escrita direta na tabela: a RLS não deixa, de propósito.
 *
 * MORA FORA do segmento do escritório porque serve aos DOIS momentos da
 * compra: o contratante que ainda não tem banca (e por isso não tem id para
 * pôr na rota) e o gestor que troca de plano de um escritório já existente.
 */
export async function escolherPlano(dados: FormData): Promise<void> {
  const contexto = await contextoLogado();
  // O id vem do formulário, isto é, do cliente, e por isso é procurado entre
  // os vínculos que o banco devolveu para esta sessão. A conferência vem
  // ANTES da RPC porque até a volta com erro precisa saber para onde
  // retornar.
  //
  // CAMPO VAZIO É UM CASO LEGÍTIMO, e não formulário quebrado: é a primeira
  // licença, contratada antes de a banca existir. Vale para quem ainda não é
  // SÓCIO de nenhuma (inclusive a estagiária que vai fundar a dela), porque
  // a licença é por pessoa. Já sendo sócio e sem o campo, o formulário
  // esqueceu de dizer de qual banca é a troca, e adivinhar seria mexer no
  // plano do escritório errado.
  const pedido = String(dados.get("escritorio") ?? "");
  const vinculo = pedido === "" ? null : vinculoDaAcao(contexto, pedido);
  const primeiraLicenca = pedido === "" && !ehSocioEmAlguma(contexto.fluxos);
  if (vinculo === null && !primeiraLicenca) {
    redirect(destinoInicial(contexto.fluxos));
  }

  // Sem vínculo o funil é o de fora do segmento, que é onde ele mora.
  const paginaDePlanos =
    vinculo === null ? "/planos" : `/escritorio/${vinculo.id}/planos`;
  const paginaDaAssinatura =
    vinculo === null ? "/assinatura" : `/escritorio/${vinculo.id}/assinatura`;

  const planCode = String(dados.get("plano") ?? "");
  const ciclo = dados.get("ciclo") === "annual" ? "annual" : "monthly";

  // O cliente do contexto, e não um segundo montado do zero: `contextoLogado`
  // é cache() por requisição e já leu os cookies uma vez.
  //
  // A RPC ainda não recebe escritório: ela escolhe sozinha o do gestor. Com
  // dois escritórios geridos isso não basta, e a correção é do lado do banco
  // (assunto de cobrança), então aqui a chamada segue igual.
  const { error } = await contexto.supabase.rpc("choose_law_firm_plan", {
    plan_code_value: planCode,
    billing_cycle_value: ciclo,
  });

  if (error) {
    redirect(
      `${paginaDePlanos}?erro=${encodeURIComponent(traduzErroDeEscolhaDePlano(error.message))}`,
    );
  }

  redirect(paginaDaAssinatura);
}
