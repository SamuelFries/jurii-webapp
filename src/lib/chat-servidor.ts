import type { SupabaseClient } from "@supabase/supabase-js";

import type { MensagemParaTela } from "@/components/chat";
import { estadoDeEntrega, solicitacaoDaMetadata } from "@/lib/dominio/chat";
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
/** Tamanho da página, o mesmo do app. */
export const TAMANHO_DA_PAGINA = 50;

export async function carregaMensagens(
  supabase: SupabaseClient,
  conversaId: string,
  meuId: string,
  antesDe?: { criadaEmIso: string; id: string } | null,
): Promise<{ mensagens: MensagemParaTela[]; temAnteriores: boolean }> {
  // A MESMA RPC do app (fetch_conversation_messages_page): cursor composto
  // (created_at, id), estável sob timestamps empatados, RLS de messages
  // decidindo o que volta. Antes o webapp lia com limit(100) e a mensagem
  // 101 sumia em silêncio, o furo que o app já tinha fechado.
  const { data } = await supabase.rpc("fetch_conversation_messages_page", {
    conversation_id_value: conversaId,
    before_created_at: antesDe?.criadaEmIso ?? null,
    before_id: antesDe?.id ?? null,
    page_size: TAMANHO_DA_PAGINA + 1,
  });

  const brutas = ((data as Record<string, unknown>[] | null) ?? []);
  const temAnteriores = brutas.length > TAMANHO_DA_PAGINA;
  const linhas = (temAnteriores ? brutas.slice(0, TAMANHO_DA_PAGINA) : brutas)
    .slice()
    .reverse();

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

  const mensagens: MensagemParaTela[] = linhas.map((linha) => {
    const metadata = (linha.metadata ?? {}) as Record<string, unknown>;
    const indicacao = indicacaoDaMetadata(metadata);
    const tipo: MensagemParaTela["tipo"] =
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
      senderId: linha.sender_id == null ? null : String(linha.sender_id),
      senderType: String(linha.sender_type ?? ""),
      criadaEmIso: String(linha.created_at),
      apagadaParaTodos: linha.deleted_for_all_at != null,
      tipo,
      anexo: anexosPorMensagem.get(String(linha.id)) ?? null,
      indicacao,
      solicitacao: solicitacaoDaMetadata(metadata),
      entrega: estadoDeEntrega({
        entregueEm: linha.delivered_at == null ? null : String(linha.delivered_at),
        lidaEm: linha.read_at == null ? null : String(linha.read_at),
      }),
    };
  });

  return { mensagens, temAnteriores };
}

/**
 * Quem atende esta conversa, e o caso ligado, para o cabeçalho.
 *
 * O responsável vem do CASO quando a conversa tem case_id (o caso é onde a
 * atribuição mora); sem caso, do lawyer_id da conversa (chat pessoal do
 * advogado). Nulo é "sem responsável", e a tela diz isso; nunca inventa.
 */
export async function carregaContextoDoAtendimento(
  supabase: SupabaseClient,
  conversaId: string,
  lawFirmId: string | null = null,
): Promise<{
  casoId: string | null;
  casoTitulo: string | null;
  responsavelId: string | null;
  responsavelNome: string | null;
  clienteId: string | null;
  /** O lawyer_id da própria conversa: é a coluna que create_case_request
   *  compara com auth.uid(). Pode diferir do responsável do caso. */
  advogadoDaConversaId: string | null;
}> {
  const { data: conversa } = await supabase
    .from("conversations")
    .select("case_id, lawyer_id, client_id")
    .eq("id", conversaId)
    .maybeSingle();

  const casoId = conversa?.case_id == null ? null : String(conversa.case_id);
  let responsavelId =
    conversa?.lawyer_id == null ? null : String(conversa.lawyer_id);
  let casoTitulo: string | null = null;

  let responsavelNome: string | null = null;

  if (casoId !== null && lawFirmId !== null) {
    // NA BANCA, o caso vem pela RPC do escritório (fetch_law_firm_cases), e
    // não por leitura direta de legal_cases. A leitura direta passa por
    // can_access_case, que só reconhece PARTICIPANTE do caso: a secretária
    // não é participante, a RLS não entrega a linha, e a tela concluiria
    // "sem responsável" num caso que tem responsável. Ausência de permissão
    // virando ausência de dado, o mesmo engano do "sem plano". A RPC do
    // escritório é o que a secretária pode e deve ler.
    const { data: casos } = await supabase.rpc("fetch_law_firm_cases", {
      law_firm_id_value: lawFirmId,
    });
    const caso = ((casos as Record<string, unknown>[] | null) ?? []).find(
      (c) => String(c.id) === casoId,
    );
    if (caso) {
      casoTitulo = String(caso.title ?? "");
      responsavelId =
        caso.assigned_lawyer_id == null ? null : String(caso.assigned_lawyer_id);
      responsavelNome =
        caso.assigned_lawyer == null || String(caso.assigned_lawyer) === ""
          ? null
          : String(caso.assigned_lawyer);
    }
  } else if (casoId !== null) {
    // Área pessoal do advogado: ele É participante, a leitura direta serve.
    const { data: caso } = await supabase
      .from("legal_cases")
      .select("title, assigned_lawyer_id")
      .eq("id", casoId)
      .maybeSingle();
    if (caso) {
      casoTitulo = String(caso.title ?? "");
      responsavelId =
        caso.assigned_lawyer_id == null ? null : String(caso.assigned_lawyer_id);
    }
  }

  if (responsavelId !== null && responsavelNome === null) {
    const { data: perfil } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", responsavelId)
      .maybeSingle();
    responsavelNome = perfil?.full_name ? String(perfil.full_name) : null;
  }

  return {
    casoId,
    casoTitulo,
    responsavelId,
    responsavelNome,
    clienteId: conversa?.client_id == null ? null : String(conversa.client_id),
    advogadoDaConversaId:
      conversa?.lawyer_id == null ? null : String(conversa.lawyer_id),
  };
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
