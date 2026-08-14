"use server";

import { redirect } from "next/navigation";

import { contextoLogado, vinculoDaAcao } from "@/lib/contexto";
import { destinoInicial } from "@/lib/fluxos";
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
  // CAMPO VAZIO É UM CASO LEGÍTIMO, e não formulário quebrado: é contratar
  // uma licença antes de a banca existir. Vale para qualquer pessoa, sócia
  // ou não, desde que a cobrança virou por escritório: quem já tem uma banca
  // e quer a segunda compra a segunda licença pelo mesmo caminho.
  //
  // Quem impede o abuso é o BANCO, e não esta linha: o índice
  // law_firm_license_one_unspent_per_owner deixa no máximo UMA licença não
  // gasta por pessoa, e a RPC reaproveita a existente em vez de criar outra.
  // Aqui a régua de cargo saiu porque ela dizia a mesma coisa que a licença
  // já diz, e pior, dizia errado.
  const pedido = String(dados.get("escritorio") ?? "");
  const vinculo = pedido === "" ? null : vinculoDaAcao(contexto, pedido);
  if (pedido !== "" && vinculo === null) {
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
  // O ESCRITÓRIO VAI NO ARGUMENTO, e é o que diz à RPC qual das duas coisas
  // está acontecendo: com id, trocar o plano DAQUELA banca (e o servidor
  // exige ser gestor dela); sem id, contratar uma licença nova para abrir
  // uma. Antes a RPC escolhia sozinha, e com dois escritórios geridos ela
  // trocava o plano do errado.
  const { error } = await contexto.supabase.rpc("choose_law_firm_plan", {
    plan_code_value: planCode,
    billing_cycle_value: ciclo,
    law_firm_id_value: vinculo?.id ?? null,
  });

  if (error) {
    redirect(
      `${paginaDePlanos}?erro=${encodeURIComponent(traduzErroDeEscolhaDePlano(error.message))}`,
    );
  }

  redirect(paginaDaAssinatura);
}
