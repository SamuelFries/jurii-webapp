"use server";

import { redirect } from "next/navigation";

import { caminhoInterno } from "@/lib/caminho-seguro";
import { clienteDoServidor } from "@/lib/supabase/servidor";

function volta(caminho: string, sufixo: string): never {
  const destino = caminhoInterno(caminho, "/advogado");
  const separador = destino.includes("?") ? "&" : "?";
  redirect(`${destino}${separador}${sufixo}`);
}

/**
 * Propõe o caso pela MESMA RPC do app (create_case_request). O caso nasce
 * na conversa: o cliente recebe a solicitação em Meus casos e decide lá.
 * Quem pode propor é decidido pelo SERVIDOR (o profissional responsável
 * pela conversa); aqui só se traduz a recusa.
 */
export async function proporCaso(dados: FormData): Promise<void> {
  const voltar = String(dados.get("voltar") ?? "/advogado");
  const titulo = String(dados.get("titulo") ?? "").trim();
  const area = String(dados.get("area") ?? "").trim();

  if (titulo === "" || area === "") {
    volta(voltar, `erro=${encodeURIComponent("Dê um título e escolha a área.")}`);
  }

  const supabase = await clienteDoServidor();
  const { error } = await supabase.rpc("create_case_request", {
    conversation_id_value: String(dados.get("conversa") ?? ""),
    title_value: titulo,
    area_value: area,
    summary_value: String(dados.get("resumo") ?? "").trim(),
  });

  if (error) {
    const mensagem = error.message.includes("Only the responsible professional")
      ? "Só o profissional responsável pela conversa pode propor o caso."
      : error.message.includes("Title and area are required")
        ? "Dê um título e escolha a área."
        : "Não foi possível enviar a solicitação. Tente de novo.";
    volta(voltar, `erro=${encodeURIComponent(mensagem)}`);
  }

  volta(voltar, "ok=proposta");
}
