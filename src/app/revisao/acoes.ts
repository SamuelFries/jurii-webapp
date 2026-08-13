"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { clienteDoServidor } from "@/lib/supabase/servidor";

/**
 * A decisão sobre uma verificação.
 *
 * Nenhuma chave especial mora aqui: a chamada sai com a sessão da PESSOA,
 * e quem confere se ela é da equipe é o banco, dentro de
 * review_*_verification. Se um dia esta rota vazar, ela não entrega nada
 * que a mesma pessoa já não pudesse fazer.
 */
export async function decidirVerificacao(dados: FormData): Promise<void> {
  const tipo = String(dados.get("tipo") ?? "");
  const id = String(dados.get("id") ?? "");
  const aprovar = String(dados.get("decisao")) === "aprovar";
  const motivo = String(dados.get("motivo") ?? "").trim();

  if (!aprovar && motivo === "") {
    redirect(
      `/revisao?erro=${encodeURIComponent("Escreva o motivo da recusa: é o que a pessoa vai ler para corrigir.")}`,
    );
  }

  const supabase = await clienteDoServidor();
  const { error } = await supabase.rpc(
    tipo === "law_firm"
      ? "review_law_firm_verification"
      : "review_lawyer_verification",
    {
      verification_id_value: id,
      approve_value: aprovar,
      reason_value: aprovar ? null : motivo,
    },
  );

  if (error) {
    const mensagem = error.message.includes("Only Jurii staff")
      ? "Esta área é da equipe da Jurii."
      : error.message.includes("Rejection reason")
        ? "A recusa precisa de motivo."
        : "Não foi possível registrar a decisão. Tente de novo.";
    redirect(`/revisao?erro=${encodeURIComponent(mensagem)}`);
  }

  revalidatePath("/revisao");
  redirect(`/revisao?ok=${aprovar ? "aprovada" : "recusada"}`);
}

/**
 * As URLs dos documentos de UMA ficha, assinadas no momento em que a
 * pessoa abre.
 *
 * POR QUE SÓ AGORA: assinar na carga da página gastava uma chamada por
 * documento de TODA a fila, e a validade começava a correr antes de
 * alguém olhar. Assinando aqui, a página carrega sem tocar no storage e os
 * dez minutos começam quando a análise começa.
 *
 * Não há checagem de equipe neste arquivo, e é de propósito: a assinatura
 * sai com a sessão da PESSOA, e a policy do balde só deixa quem é da
 * equipe ler. Quem não for recebe erro do próprio storage.
 */
export async function assinaDocumentos(
  caminhos: { bucket: string; caminho: string }[],
): Promise<Record<string, { miniatura: string; original: string }>> {
  const supabase = await clienteDoServidor();
  const saida: Record<string, { miniatura: string; original: string }> = {};

  await Promise.all(
    caminhos.map(async ({ bucket, caminho }) => {
      const [mini, cheio] = await Promise.all([
        // A miniatura é o que a tela mostra: medido em produção, uma
        // carteira de OAB de 1978 KB vira 141 KB. O original fica no
        // clique, porque assinar OAB por miniatura seria adivinhação.
        supabase.storage
          .from(bucket)
          .createSignedUrl(caminho, 600, {
            transform: { width: 420, quality: 70 },
          }),
        supabase.storage.from(bucket).createSignedUrl(caminho, 600),
      ]);
      if (cheio.data?.signedUrl) {
        saida[caminho] = {
          // Sem transformação disponível, a miniatura cai no original: a
          // tela funciona igual, só pesa mais.
          miniatura: mini.data?.signedUrl ?? cheio.data.signedUrl,
          original: cheio.data.signedUrl,
        };
      }
    }),
  );

  return saida;
}
