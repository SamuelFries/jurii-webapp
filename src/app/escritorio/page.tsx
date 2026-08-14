import { redirect } from "next/navigation";

import { contextoLogado, escritorioPreferido } from "@/lib/contexto";
import { destinoInicial } from "@/lib/fluxos";

export const dynamic = "force-dynamic";

/**
 * `/escritorio` sem id: a porta de compatibilidade.
 *
 * Existe por dois motivos concretos. O primeiro é que todo link antigo aponta
 * para cá, e endereço salvo que passa a dar 404 é o mesmo mal que a gente
 * combateu ao extirpar link morto do app. O segundo é o pós-login, que precisa
 * de um destino antes de a pessoa ter escolhido qualquer coisa.
 *
 * A escolha vem do cookie, e o cookie NÃO manda: `destinoInicial` confere o id
 * contra a lista de vínculos, então preferência apontando para escritório de
 * onde a pessoa saiu cai no primeiro válido em vez de num contexto morto.
 */
export default async function EntradaDoEscritorio() {
  const [contexto, preferido] = await Promise.all([
    contextoLogado(),
    escritorioPreferido(),
  ]);
  redirect(destinoInicial(contexto.fluxos, preferido));
}
