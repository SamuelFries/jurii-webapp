import type { SupabaseClient } from "@supabase/supabase-js";

import type { MensagemParaTela } from "@/components/chat";

/**
 * Histórico da conversa, o mesmo contrato do app: as 100 mais recentes
 * (teto documentado no MessagingRepository), devolvidas em ordem de leitura.
 * A RLS decide se a pessoa pode ver esta conversa; linha nenhuma volta se
 * não puder, e a tela mostra o chat vazio em vez de vazar existência.
 */
export async function carregaMensagens(
  supabase: SupabaseClient,
  conversaId: string,
  meuId: string,
): Promise<MensagemParaTela[]> {
  const { data } = await supabase
    .from("messages")
    .select("id, sender_id, body, deleted_for_all_at, created_at")
    .eq("conversation_id", conversaId)
    .order("created_at", { ascending: false })
    .limit(100);

  return (data ?? [])
    .map((linha) => ({
      id: String(linha.id),
      corpo: String(linha.body ?? ""),
      minha: String(linha.sender_id) === meuId,
      criadaEmIso: String(linha.created_at),
      apagadaParaTodos: linha.deleted_for_all_at != null,
    }))
    .reverse();
}
