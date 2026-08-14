import { redirect } from "next/navigation";

import { contextoLogado, escritorioPreferido } from "@/lib/contexto";
import { destinoInicial } from "@/lib/fluxos";

export const dynamic = "force-dynamic";

/**
 * A raiz decide a casa da pessoa: escritório primeiro, advogado depois,
 * cliente por fim. É o mesmo critério do destino pós-login.
 *
 * A PREFERÊNCIA ENTRA AQUI porque este é justamente o momento em que
 * ninguém disse qual escritório abrir. Sem ela, quem trabalha em duas bancas
 * cairia sempre na primeira da lista e teria de trocar de escritório toda
 * vez que entrasse. O cookie não manda sozinho: `destinoInicial` confere o
 * id contra os vínculos e cai no primeiro válido se a preferência apontar
 * para um vínculo que caiu.
 */
export default async function PaginaRaiz() {
  const [contexto, preferido] = await Promise.all([
    contextoLogado(),
    escritorioPreferido(),
  ]);
  redirect(destinoInicial(contexto.fluxos, preferido));
}
