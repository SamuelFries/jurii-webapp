import { redirect } from "next/navigation";

import { contextoLogado } from "@/lib/contexto";
import { destinoInicial } from "@/lib/fluxos";

export const dynamic = "force-dynamic";

/** A raiz decide a casa da pessoa: escritório primeiro, advogado depois,
 * cliente por fim. É o mesmo critério do destino pós-login. */
export default async function PaginaRaiz() {
  const contexto = await contextoLogado();
  redirect(destinoInicial(contexto.fluxos));
}
