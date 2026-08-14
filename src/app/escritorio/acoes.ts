"use server";

import { redirect } from "next/navigation";

import { contextoLogado } from "@/lib/contexto";
import { guardaEscritorioPreferido } from "@/lib/escritorio-ativo";
import { destinoInicial, vinculoCom } from "@/lib/fluxos";

/**
 * Trocar o escritório ativo.
 *
 * TROCAR NÃO MEXE EM VÍNCULO NENHUM: quem é sócio numa banca e advogado em
 * outra continua sendo as duas coisas depois de trocar. Isto aqui grava uma
 * preferência e leva para a outra casa, nada mais.
 *
 * O id vem do formulário, isto é, do cliente, e por isso é conferido contra a
 * lista de vínculos que o BANCO devolveu para esta sessão antes de virar
 * destino. Id de escritório alheio não vira contexto: cai no destino da
 * própria pessoa.
 */
export async function trocarDeEscritorio(dados: FormData): Promise<void> {
  const contexto = await contextoLogado();
  const pedido = String(dados.get("escritorio") ?? "");
  const vinculo = vinculoCom(contexto.fluxos, pedido);

  if (vinculo === null) {
    redirect(destinoInicial(contexto.fluxos));
  }

  await guardaEscritorioPreferido(vinculo.id);
  redirect(`/escritorio/${vinculo.id}`);
}
