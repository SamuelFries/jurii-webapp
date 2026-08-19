"use server";

/* Esta pasta NAO e mais rota: com o recorte profissional, /casos do
 * cliente saiu do webapp. O arquivo fica aqui porque e o vizinho natural
 * das duas telas que o usam (/advogado/casos/[id] e
 * /escritorio/[escritorio]/casos/[id]), como acontece com
 * notificacoes/acoes.ts. Pasta sem page.tsx nao vira rota no App Router. */

import { redirect } from "next/navigation";

import { caminhoInterno } from "@/lib/caminho-seguro";
import { contextoLogado, vinculoDaAcao } from "@/lib/contexto";
import { clienteDoServidor } from "@/lib/supabase/servidor";

/**
 * As ações do detalhe de caso, MESMAS RPCs do app. Cada formulário manda
 * `voltar` (a rota do detalhe no fluxo em que a pessoa está), porque o
 * mesmo detalhe existe em /advogado/casos e em /escritorio/{id}/casos, e no
 * do escritório a rota ainda carrega QUAL banca está aberta.
 *
 * Quem decide permissão é o SERVIDOR dentro de cada RPC; aqui só se traduz
 * a recusa para a língua de quem lê.
 */

function volta(caminho: string, erro?: string, ok?: string): never {
  // Sucesso confirmado por ?ok= (vira toast na casca); erro por ?erro=.
  // Antes só o erro falava e o sucesso era silêncio: a pessoa clicava em
  // "Registrar" e não sabia se tinha registrado.
  if (erro) redirect(`${caminho}?erro=${encodeURIComponent(erro)}`);
  if (ok) redirect(`${caminho}?ok=${encodeURIComponent(ok)}`);
  redirect(caminho);
}

function caminhoSeguro(dados: FormData): string {
  // Só caminho interno: redirect aberto é porta de phishing. Quem decide é
  // o parser de URL, e não comparação de prefixo (ver caminho-seguro.ts).
  return caminhoInterno(dados.get("voltar"), "/");
}

export async function adicionarAtualizacao(dados: FormData): Promise<void> {
  const voltar = caminhoSeguro(dados);
  const titulo = String(dados.get("titulo") ?? "").trim();
  const corpo = String(dados.get("corpo") ?? "").trim();
  if (titulo === "") volta(voltar, "Dê um título à atualização.");

  const supabase = await clienteDoServidor();
  const { error } = await supabase.rpc("add_case_update", {
    case_id_value: String(dados.get("caso") ?? ""),
    title_value: titulo,
    body_value: corpo,
  });

  if (error) {
    volta(voltar, "Não foi possível registrar a atualização. Tente de novo.");
  }
  volta(voltar, undefined, "atualizacao");
}

export async function definirCnj(dados: FormData): Promise<void> {
  const voltar = caminhoSeguro(dados);
  const cru = String(dados.get("cnj") ?? "").replace(/[^0-9]/g, "");
  if (cru !== "" && cru.length !== 20) {
    volta(voltar, "O número CNJ tem 20 dígitos. Confira e tente de novo.");
  }

  const supabase = await clienteDoServidor();
  const { error } = await supabase.rpc("set_case_cnj_number", {
    case_id_value: String(dados.get("caso") ?? ""),
    cnj_value: cru === "" ? null : cru,
  });

  if (error) {
    volta(
      voltar,
      "O número não foi aceito. Confira os dígitos (o banco valida o dígito verificador).",
    );
  }
  volta(voltar, undefined, "cnj");
}

export async function encerrarCaso(dados: FormData): Promise<void> {
  const voltar = caminhoSeguro(dados);
  const supabase = await clienteDoServidor();
  const { error } = await supabase.rpc("close_legal_case", {
    case_id_value: String(dados.get("caso") ?? ""),
  });
  if (error) volta(voltar, "Não foi possível encerrar o caso.");
  volta(voltar, undefined, "encerrado");
}

export async function reabrirCaso(dados: FormData): Promise<void> {
  const voltar = caminhoSeguro(dados);
  const supabase = await clienteDoServidor();
  const { error } = await supabase.rpc("reopen_legal_case", {
    case_id_value: String(dados.get("caso") ?? ""),
  });
  if (error) volta(voltar, "Não foi possível reabrir o caso.");
  volta(voltar, undefined, "reaberto");
}

export async function atribuirAdvogado(dados: FormData): Promise<void> {
  const voltar = caminhoSeguro(dados);
  const lawyerProfileId = String(dados.get("advogado") ?? "");
  if (lawyerProfileId === "") volta(voltar, "Escolha um advogado.");

  // O ESCRITÓRIO É CONFERIDO ANTES DE VIRAR ARGUMENTO. A RPC já recusa quem
  // não gerencia casos daquela banca, então o id forjado não passava pelo
  // banco; o que passava era a MENSAGEM: a pessoa recebia "só gestores de
  // caso podem atribuir" sem entender por quê, porque a tela dizia um
  // escritório e a chamada ia com outro. Com dois vínculos isso deixa de ser
  // hipótese.
  const contexto = await contextoLogado();
  const vinculo = vinculoDaAcao(contexto, String(dados.get("escritorio") ?? ""));
  if (vinculo === null) volta(voltar, "Escritório inválido para esta ação.");

  const supabase = contexto.supabase;
  const { error } = await supabase.rpc("assign_law_firm_case", {
    law_firm_id_value: vinculo.id,
    case_id_value: String(dados.get("caso") ?? ""),
    lawyer_profile_id_value: lawyerProfileId,
  });

  if (error) {
    const mensagem = error.message.includes("conversation_blocked")
      ? "O cliente bloqueou a conversa. Não é possível atribuir enquanto ela estiver bloqueada."
      : error.message.includes("Only office case managers")
        ? "Apenas sócio, admin e secretária podem atribuir casos."
        : "Não foi possível atribuir o caso. Tente de novo.";
    volta(voltar, mensagem);
  }
  volta(voltar, undefined, "atribuido");
}
