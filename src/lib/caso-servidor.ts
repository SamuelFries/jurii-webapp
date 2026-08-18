import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * O que a tela do caso precisa e as RPCs do caso não entregam: o NOME do
 * responsável (só vem o id), a CONVERSA ligada (o caminho de volta para o
 * chat), os DOCUMENTOS (a seção só existia no app), e se o cliente está
 * aguardando (a mesma regra da faixa do chat).
 *
 * Tudo por leituras que a RLS já permite a quem participa. Onde a RLS não
 * entrega (a secretária no caso), a resposta é nulo/vazio, e a tela diz que
 * não está disponível para o papel em vez de fingir que não existe.
 */

export interface DocumentoDoCaso {
  id: string;
  titulo: string;
  tamanho: string;
  quemSubiu: string;
  quando: Date | null;
  url: string | null;
}

export async function carregaContextoDoCaso(
  supabase: SupabaseClient,
  casoId: string,
  lawFirmId: string | null,
  responsavelId: string | null,
): Promise<{
  responsavelNome: string | null;
  conversaId: string | null;
  clienteAguardaDesde: Date | null;
  documentos: DocumentoDoCaso[];
}> {
  const [conversaRes, docsRes, responsavelRes] = await Promise.all([
    // A conversa que aponta para este caso. Numa banca há uma por caso; a
    // mais recente vale.
    supabase
      .from("conversations")
      .select("id, last_message_at")
      .eq("case_id", casoId)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("case_documents")
      .select("id, title, file_size_bytes, uploaded_by, storage_path, created_at")
      .eq("case_id", casoId)
      .order("created_at", { ascending: false }),
    responsavelId === null
      ? Promise.resolve({ data: null })
      : supabase
          .from("profiles")
          .select("full_name")
          .eq("id", responsavelId)
          .maybeSingle(),
  ]);

  const conversaId = conversaRes.data?.id == null ? null : String(conversaRes.data.id);

  // Cliente aguardando: a ÚLTIMA mensagem (não sistema) da conversa é do
  // cliente. Mesma regra do chat e do `urgent` da carteira.
  let clienteAguardaDesde: Date | null = null;
  if (conversaId !== null) {
    const { data: ultima } = await supabase
      .from("messages")
      .select("sender_type, created_at")
      .eq("conversation_id", conversaId)
      .neq("sender_type", "system")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (ultima && String(ultima.sender_type) === "client") {
      clienteAguardaDesde = new Date(String(ultima.created_at));
    }
  }

  // Quem subiu cada documento: um lote de perfis, não um por linha.
  const docs = (docsRes.data ?? []) as Record<string, unknown>[];
  const idsDeQuemSubiu = [...new Set(docs.map((d) => String(d.uploaded_by)))];
  const nomePorId = new Map<string, string>();
  if (idsDeQuemSubiu.length > 0) {
    const { data: perfis } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", idsDeQuemSubiu);
    for (const p of perfis ?? []) nomePorId.set(String(p.id), String(p.full_name ?? ""));
  }

  // URLs assinadas em UMA chamada, 5 minutos (o mesmo TTL do app: cobre o
  // toque, e o link que vazar de um print morre sozinho).
  const urlPorCaminho = new Map<string, string>();
  const caminhos = docs.map((d) => String(d.storage_path));
  if (caminhos.length > 0) {
    const { data: assinadas } = await supabase.storage
      .from("case-documents")
      .createSignedUrls(caminhos, 300);
    for (const a of assinadas ?? []) {
      if (a.signedUrl && a.path) urlPorCaminho.set(a.path, a.signedUrl);
    }
  }

  const documentos: DocumentoDoCaso[] = docs.map((d) => ({
    id: String(d.id),
    titulo: String(d.title ?? "Documento"),
    tamanho: tamanhoLegivel(
      typeof d.file_size_bytes === "number" ? d.file_size_bytes : Number(d.file_size_bytes ?? 0),
    ),
    quemSubiu: nomePorId.get(String(d.uploaded_by)) || "Equipe",
    quando: d.created_at == null ? null : new Date(String(d.created_at)),
    url: urlPorCaminho.get(String(d.storage_path)) ?? null,
  }));

  return {
    responsavelNome:
      responsavelRes.data?.full_name == null ? null : String(responsavelRes.data.full_name),
    conversaId,
    clienteAguardaDesde,
    documentos,
  };
}

/** "1,2 MB" / "340 KB", como no app. */
export function tamanhoLegivel(bytes: number): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  const mb = bytes / (1024 * 1024);
  return `${(mb >= 10 ? Math.round(mb).toString() : mb.toFixed(1)).replace(".", ",")} MB`;
}
