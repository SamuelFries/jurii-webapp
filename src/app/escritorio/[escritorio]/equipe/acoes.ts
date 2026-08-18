"use server";

import { redirect } from "next/navigation";

import { contextoLogado, vinculoDaAcao } from "@/lib/contexto";
import {
  destinoInicial,
  normalizaPapeis,
  papeisEmOrdem,
  type PapelNoEscritorio,
} from "@/lib/fluxos";
import { clienteDoServidor } from "@/lib/supabase/servidor";

/**
 * Convida um advogado VERIFICADO pela OAB, a MESMA RPC do app. O servidor
 * decide tudo de novo: papel de quem convida (sócio/admin), limite de
 * vagas do plano, OAB válida e limite de tentativas.
 */
/**
 * A frase de quem esbarrou na assinatura parada, e ela é a MESMA nos dois
 * caminhos de propósito: convidar de fora e promover quem já está dentro
 * ocupam a mesma vaga, então recusar por motivos diferentes seria inventar
 * uma distinção que o banco não faz.
 *
 * E é diferente da frase do teto cheio. "Aumente o plano" mandaria a pessoa
 * gastar mais quando o que resolve o caso dela é pagar o que já contratou.
 */
const ASSINATURA_PARADA =
  "A assinatura do escritório está pendente. Regularize o pagamento em Assinatura para voltar a incluir advogados.";

export async function convidarAdvogado(dados: FormData): Promise<void> {
  // O id do escritório vem do formulário, isto é, do cliente, e por isso só
  // vira argumento da RPC depois de achado entre os vínculos que o banco
  // devolveu para esta sessão. A conferência vem ANTES da OAB porque até a
  // volta com erro precisa saber para qual escritório retornar.
  const contexto = await contextoLogado();
  const vinculo = vinculoDaAcao(
    contexto,
    String(dados.get("escritorio") ?? ""),
  );
  if (vinculo === null) {
    redirect(destinoInicial(contexto.fluxos));
  }

  const uf = String(dados.get("uf") ?? "").trim().toUpperCase();
  const numero = String(dados.get("oab") ?? "").replace(/[^0-9A-Za-z]/g, "");

  if (uf.length !== 2 || numero === "") {
    redirect(
      `/escritorio/${vinculo.id}/equipe?erro=${encodeURIComponent("Informe a UF e o número da OAB.")}`,
    );
  }

  const supabase = await clienteDoServidor();
  const { error } = await supabase.rpc("invite_verified_lawyer_to_law_firm", {
    law_firm_id_value: vinculo.id,
    oab_state_value: uf,
    oab_number_value: numero,
  });

  if (error) {
    const mensagem = error.message.includes("Subscription is not active")
      ? ASSINATURA_PARADA
      : error.message.includes("seat limit")
        ? "O plano atual não tem mais vaga de advogado. Aumente o plano em Assinatura."
        : error.message.includes("Only active office owners")
          ? "Apenas sócio e admin convidam advogados."
          : error.message.includes("Invalid OAB")
            ? "Não achamos advogado verificado com essa OAB. Confira UF e número."
            : error.message.includes("Too many invite attempts")
              ? "Muitas tentativas de convite. Aguarde um pouco e tente de novo."
              : "Não foi possível convidar. Tente de novo.";
    redirect(
      `/escritorio/${vinculo.id}/equipe?erro=${encodeURIComponent(mensagem)}`,
    );
  }

  redirect(`/escritorio/${vinculo.id}/equipe?ok=convite`);
}

/**
 * Trocar os papéis de quem já está na equipe, MESMA RPC do app
 * (update_law_firm_member_roles). Quem decide é o servidor, e ele tem três
 * guardas que a tela NÃO tenta adivinhar, só traduz quando recusam:
 *
 *  - só sócio e admin ativos editam papéis;
 *  - só SÓCIO concede ou tira o papel de sócio;
 *  - o escritório precisa manter ao menos um sócio (tirar o último é
 *    recusado, senão o escritório ficaria sem quem administra).
 *
 * A lista nunca vai vazia: o servidor recusa, e a normalização já cai para
 * advogado antes de sair daqui.
 */
export async function salvarPapeis(dados: FormData): Promise<void> {
  // Mesma conferência do convite: o id do formulário só vale se for um
  // vínculo desta sessão.
  const contexto = await contextoLogado();
  const vinculo = vinculoDaAcao(
    contexto,
    String(dados.get("escritorio") ?? ""),
  );
  if (vinculo === null) {
    redirect(destinoInicial(contexto.fluxos));
  }

  const membroId = String(dados.get("membro") ?? "");
  const escolhidos = dados
    .getAll("papeis")
    .map((papel) => String(papel))
    .filter((papel): papel is PapelNoEscritorio =>
      papeisEmOrdem.includes(papel as PapelNoEscritorio),
    );

  const supabase = await clienteDoServidor();
  const { error } = await supabase.rpc("update_law_firm_member_roles", {
    law_firm_id_value: vinculo.id,
    member_profile_id_value: membroId,
    roles_value: normalizaPapeis(escolhidos),
  });

  if (error) {
    // Promover a advogado passou a ocupar vaga na 20260907120000, então esta
    // ação ganhou as duas recusas de teto que antes só o convite tinha. Sem
    // elas, promover alguém com a assinatura parada devolvia "não foi
    // possível salvar os papéis", que não diz nada nem leva a lugar nenhum.
    const mensagem = error.message.includes("Subscription is not active")
      ? ASSINATURA_PARADA
      : error.message.includes("seat limit")
        ? "O plano atual não tem mais vaga de advogado. Aumente o plano em Assinatura para promover."
        : error.message.includes("keep at least one owner")
          ? "O escritório precisa de pelo menos um sócio. Promova outra pessoa antes de tirar este papel."
          : error.message.includes("Only owners can grant or remove owner")
            ? "Somente um sócio concede ou retira o papel de sócio."
            : error.message.includes("Only active office owners and admins")
              ? "Somente sócio e admin do escritório editam papéis."
              : error.message.includes("Firm member not found")
                ? "Esta pessoa não está mais na equipe."
                : "Não foi possível salvar os papéis. Tente de novo.";
    redirect(
      `/escritorio/${vinculo.id}/equipe?erro=${encodeURIComponent(mensagem)}`,
    );
  }
  redirect(`/escritorio/${vinculo.id}/equipe?ok=papeis`);
}

/**
 * Gera um link de convite de uso único para secretária ou estagiário.
 *
 * QUEM DECIDE É O BANCO (criar_link_de_convite): gestor, papel na lista
 * fechada, assinatura viva e o orçamento de tentativas compartilhado com o
 * convite por OAB. O token volta UMA vez, no redirect, e é a única vez que
 * ele existe fora do hash: a tela o mostra para copiar e ele não é
 * recuperável depois, de propósito.
 */
export async function gerarLinkDeConvite(dados: FormData): Promise<void> {
  const contexto = await contextoLogado();
  const vinculo = vinculoDaAcao(
    contexto,
    String(dados.get("escritorio") ?? ""),
  );
  if (vinculo === null) {
    redirect(destinoInicial(contexto.fluxos));
  }

  const papel = String(dados.get("papel") ?? "");

  const supabase = await clienteDoServidor();
  const { data, error } = await supabase.rpc("criar_link_de_convite", {
    law_firm_id_value: vinculo.id,
    member_role_value: papel,
  });

  if (error) {
    const mensagem = error.message.includes("Subscription is not active")
      ? ASSINATURA_PARADA
      : error.message.includes("Too many invite attempts")
        ? "Muitos convites em pouco tempo. Aguarde um pouco e tente de novo."
        : error.message.includes("secretary or intern")
          ? "Link de convite é só para secretária ou estagiário."
          : "Não foi possível gerar o link. Tente de novo.";
    redirect(
      `/escritorio/${vinculo.id}/equipe?erro=${encodeURIComponent(mensagem)}`,
    );
  }

  const linha = ((data as unknown[]) ?? [])[0] as
    | { token?: string; member_role?: string }
    | undefined;
  if (linha?.token === undefined) {
    redirect(
      `/escritorio/${vinculo.id}/equipe?erro=${encodeURIComponent("Não foi possível gerar o link. Tente de novo.")}`,
    );
  }

  redirect(
    `/escritorio/${vinculo.id}/equipe?link=${encodeURIComponent(linha.token)}&papel=${encodeURIComponent(String(linha.member_role ?? papel))}`,
  );
}

/** Cancela um link em aberto. Revogar o já usado não desfaz entrada. */
export async function revogarLinkDeConvite(dados: FormData): Promise<void> {
  const contexto = await contextoLogado();
  const vinculo = vinculoDaAcao(
    contexto,
    String(dados.get("escritorio") ?? ""),
  );
  if (vinculo === null) {
    redirect(destinoInicial(contexto.fluxos));
  }

  const supabase = await clienteDoServidor();
  const { error } = await supabase.rpc("revogar_link_de_convite", {
    link_id_value: String(dados.get("link") ?? ""),
  });

  if (error) {
    redirect(
      `/escritorio/${vinculo.id}/equipe?erro=${encodeURIComponent("Não foi possível cancelar o link. Tente de novo.")}`,
    );
  }
  redirect(`/escritorio/${vinculo.id}/equipe?ok=link-cancelado`);
}

/**
 * Aprovar ou recusar um pedido de entrada.
 *
 * A CORRIDA MORRE NO BANCO: decidir_entrada_no_escritorio tranca a linha
 * (FOR UPDATE), então dois gestores clicando ao mesmo tempo dão uma decisão
 * só, e o segundo ouve QUEM decidiu. A tela nunca tenta adivinhar isso.
 *
 * Recusar não tem campo de motivo de propósito: justificativa escrita no
 * calor do momento vira mensagem que a gente entrega sem moderação nenhuma.
 */
export async function decidirPedidoDeEntrada(dados: FormData): Promise<void> {
  const contexto = await contextoLogado();
  const vinculo = vinculoDaAcao(
    contexto,
    String(dados.get("escritorio") ?? ""),
  );
  if (vinculo === null) {
    redirect(destinoInicial(contexto.fluxos));
  }

  const aprovar = String(dados.get("decisao") ?? "") === "aprovar";

  const supabase = await clienteDoServidor();
  const { error } = await supabase.rpc("decidir_entrada_no_escritorio", {
    request_id_value: String(dados.get("pedido") ?? ""),
    aprovar,
  });

  if (error) {
    const jaDecidido = error.message.match(/already decided by (.+)$/);
    const mensagem =
      jaDecidido !== null
        ? `${jaDecidido[1]} já decidiu este pedido.`
        : error.message.includes("Subscription is not active")
          ? ASSINATURA_PARADA
          : error.message.includes("expired")
            ? "Este pedido venceu. Peça à pessoa para pedir de novo com um link novo."
            : error.message.includes("Already a member")
              ? "Esta pessoa já faz parte da equipe."
              : "Não foi possível decidir agora. Tente de novo.";
    redirect(
      `/escritorio/${vinculo.id}/equipe?erro=${encodeURIComponent(mensagem)}`,
    );
  }

  redirect(
    `/escritorio/${vinculo.id}/equipe?ok=${aprovar ? "entrada-aprovada" : "entrada-recusada"}`,
  );
}
