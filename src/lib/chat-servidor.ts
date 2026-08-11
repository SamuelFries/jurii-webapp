import type { SupabaseClient } from "@supabase/supabase-js";

import type { MensagemParaTela } from "@/components/chat";
import {
  conversaDaLinha,
  indicacaoDaMetadata,
  type Conversa,
  type EscopoDeConversa,
} from "@/lib/dominio/conversas";

/**
 * Histórico da conversa, o mesmo contrato do app: as 100 mais recentes
 * (teto documentado no MessagingRepository), em ordem de leitura.
 *
 * Mensagem de ANEXO não pode virar bolha vazia: o corpo dela é vazio e o
 * conteúdo mora em message_attachments + storage. Aqui os anexos das 100
 * são buscados numa query só e as URLs assinadas em UMA chamada (TTL de 1h,
 * a vida útil razoável de uma aba aberta), igual ao lote do app.
 */
export async function carregaMensagens(
  supabase: SupabaseClient,
  conversaId: string,
  meuId: string,
): Promise<MensagemParaTela[]> {
  const { data } = await supabase
    .from("messages")
    .select("id, sender_id, body, metadata, deleted_for_all_at, created_at")
    .eq("conversation_id", conversaId)
    .order("created_at", { ascending: false })
    .limit(100);

  const linhas = (data ?? []).reverse();

  const idsComAnexo = linhas
    .filter(
      (linha) =>
        (linha.metadata as Record<string, unknown> | null)?.type ===
        "chat_attachment",
    )
    .map((linha) => String(linha.id));

  const anexosPorMensagem = new Map<
    string,
    { nome: string; tipoMime: string; url: string | null }
  >();

  if (idsComAnexo.length > 0) {
    const { data: anexos } = await supabase
      .from("message_attachments")
      .select("message_id, file_name, mime_type, storage_path")
      .in("message_id", idsComAnexo);

    const caminhos = (anexos ?? []).map((anexo) => String(anexo.storage_path));
    const { data: assinadas } = await supabase.storage
      .from("chat-attachments")
      .createSignedUrls(caminhos, 3600);

    const urlPorCaminho = new Map<string, string>();
    for (const assinada of assinadas ?? []) {
      if (assinada.signedUrl && assinada.path) {
        urlPorCaminho.set(assinada.path, assinada.signedUrl);
      }
    }

    for (const anexo of anexos ?? []) {
      anexosPorMensagem.set(String(anexo.message_id), {
        nome: String(anexo.file_name ?? "arquivo"),
        tipoMime: String(anexo.mime_type ?? ""),
        url: urlPorCaminho.get(String(anexo.storage_path)) ?? null,
      });
    }
  }

  return linhas.map((linha) => {
    const metadata = (linha.metadata ?? {}) as Record<string, unknown>;
    const indicacao = indicacaoDaMetadata(metadata);
    const tipo =
      metadata.type === "chat_attachment"
        ? "anexo"
        : metadata.type === "case_request"
          ? "solicitacao_de_caso"
          : indicacao !== null
            ? "indicacao"
            : "texto";
    return {
      id: String(linha.id),
      corpo: String(linha.body ?? ""),
      minha: String(linha.sender_id) === meuId,
      criadaEmIso: String(linha.created_at),
      apagadaParaTodos: linha.deleted_for_all_at != null,
      tipo,
      anexo: anexosPorMensagem.get(String(linha.id)) ?? null,
      indicacao,
    };
  });
}

/**
 * A conversa em si (título, área), para o cabeçalho do chat. Vem da MESMA
 * RPC das listas, que já troca o título conforme o escopo; nulo quando a
 * pessoa não participa (a RLS não devolve nada).
 */
export async function carregaConversa(
  supabase: SupabaseClient,
  conversaId: string,
  escopo: EscopoDeConversa,
  lawFirmId: string | null,
): Promise<Conversa | null> {
  const { data } = await supabase.rpc("fetch_conversations_for_current_user", {
    scope_value: escopo,
    law_firm_id_value: lawFirmId,
  });

  const linha = ((data as unknown[]) ?? []).find(
    (item) => String((item as Record<string, unknown>).id) === conversaId,
  );
  return linha ? conversaDaLinha(linha as Record<string, unknown>) : null;
}

/** Bloqueada, e por quem, pela MESMA RPC do app. Falha vira "não
 * bloqueada": errar para o lado aberto só faz o servidor recusar o envio
 * com a mensagem certa. */
export async function carregaBloqueio(
  supabase: SupabaseClient,
  conversaId: string,
): Promise<{ bloqueada: boolean; porMim: boolean }> {
  const { data } = await supabase.rpc("fetch_conversation_block_state", {
    conversation_id_value: conversaId,
  });
  const linha = ((data as unknown[]) ?? [])[0] as
    | Record<string, unknown>
    | undefined;
  return {
    bloqueada: linha?.is_blocked === true,
    porMim: linha?.blocked_by_me === true,
  };
}
