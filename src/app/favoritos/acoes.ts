"use server";

import { redirect } from "next/navigation";

import { clienteDoServidor } from "@/lib/supabase/servidor";

/**
 * Liga/desliga o coração pela MESMA RPC do app (toggle_favorite). O servidor
 * devolve o estado novo, mas aqui basta recarregar a rota: o coração da
 * tela seguinte nasce do fetch_favorite_ids.
 */
export async function alternarFavorito(dados: FormData): Promise<void> {
  const voltar = String(dados.get("voltar") ?? "/favoritos");
  const destino =
    voltar.startsWith("/") && !voltar.startsWith("//") ? voltar : "/favoritos";

  const tipo = dados.get("tipo") === "lawyer" ? "lawyer" : "law_firm";
  const supabase = await clienteDoServidor();
  await supabase.rpc("toggle_favorite", {
    target_type_value: tipo,
    target_id_value: String(dados.get("id") ?? ""),
  });

  redirect(destino);
}
