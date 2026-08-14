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
    const mensagem = error.message.includes("seat limit")
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
    const mensagem = error.message.includes("keep at least one owner")
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
