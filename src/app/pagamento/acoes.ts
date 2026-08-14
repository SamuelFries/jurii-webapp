"use server";

import { redirect } from "next/navigation";

import { contextoLogado, vinculoDaAcao } from "@/lib/contexto";
import { destinoInicial } from "@/lib/fluxos";
import { provedorConfigurado } from "@/lib/pagamentos/provedor";

/**
 * Leva para a página de pagamento do provedor.
 *
 * O QUE ESTA AÇÃO NÃO FAZ: mudar o status da assinatura. Ela cria a cobrança
 * e devolve o link, nada mais. Quem move para 'active' é o webhook, depois de
 * o dinheiro entrar de verdade. Uma tela que libera acesso porque a pessoa
 * clicou em "pagar" libera para quem clicou e desistiu.
 *
 * O ESCRITÓRIO vem do formulário e é conferido contra os vínculos, como em
 * toda ação de escritório. Vazio é caso legítimo: a licença comprada antes de
 * a banca existir.
 */
export async function irParaPagamento(dados: FormData): Promise<void> {
  const contexto = await contextoLogado();
  const provedor = provedorConfigurado();

  const pedido = String(dados.get("escritorio") ?? "");
  const vinculo = pedido === "" ? null : vinculoDaAcao(contexto, pedido);
  if (pedido !== "" && vinculo === null) {
    redirect(destinoInicial(contexto.fluxos));
  }

  const voltar =
    vinculo === null ? "/assinatura" : `/escritorio/${vinculo.id}/assinatura`;

  if (provedor === null) {
    redirect(
      `${voltar}?erro=${encodeURIComponent("O pagamento ainda não está disponível.")}`,
    );
  }

  // A ASSINATURA É LIDA DO BANCO, e não recebida do formulário: id de
  // assinatura vindo do cliente pagaria a conta de outra pessoa. A RLS já
  // limita ao que esta sessão alcança, e o filtro deixa explícito qual das
  // duas (a da banca, ou a ainda não gasta).
  let consulta = contexto.supabase
    .from("law_firm_license_subscriptions")
    .select("id, plan_code, billing_cycle, trial_ends_at, law_firm_license_plans(*)")
    .eq("owner_profile_id", contexto.usuario.id)
    .neq("status", "canceled");
  consulta =
    vinculo === null
      ? consulta.is("law_firm_id", null)
      : consulta.eq("law_firm_id", vinculo.id);

  // O PERFIL VEM POR RPC, e não por select: `profiles` é fechada a
  // authenticated (nem SELECT tem), e toda leitura passa por
  // fetch_current_profile, que é SECURITY DEFINER. Consultar a tabela direto
  // daqui devolvia vazio em silêncio, e a tela dizia "complete o CPF" para
  // quem já tinha CPF preenchido.
  const [{ data: assinatura }, { data: perfilBruto }] = await Promise.all([
    consulta.maybeSingle(),
    contexto.supabase.rpc("fetch_current_profile"),
  ]);
  const perfil = ((perfilBruto as unknown[]) ?? [])[0] as
    | { full_name?: string; cpf?: string }
    | undefined;

  if (assinatura == null) {
    redirect(
      `${voltar}?erro=${encodeURIComponent("Escolha um plano antes de pagar.")}`,
    );
  }

  const documento = String(perfil?.cpf ?? "").replace(/\D/g, "");
  if (documento.length !== 11) {
    // O provedor exige documento de quem paga. Sem CPF no perfil a cobrança
    // nem chega a ser criada, e é melhor dizer isso do que mostrar erro do
    // Asaas para a pessoa.
    redirect(
      `${voltar}?erro=${encodeURIComponent("Complete o CPF na sua conta antes de pagar.")}`,
    );
  }

  const plano = assinatura.law_firm_license_plans as
    | { name?: string; monthly_price_cents?: number; annual_price_cents?: number }
    | null;
  const anual = assinatura.billing_cycle === "annual";
  const valor = anual
    ? plano?.annual_price_cents
    : plano?.monthly_price_cents;

  if (typeof valor !== "number") {
    redirect(
      `${voltar}?erro=${encodeURIComponent("Não foi possível calcular o valor agora.")}`,
    );
  }

  try {
    const sessao = await provedor.criarCheckout({
      assinaturaId: String(assinatura.id),
      planCode: String(assinatura.plan_code),
      billingCycle: anual ? "annual" : "monthly",
      emailDoContratante: contexto.usuario.email ?? "",
      nomeDoContratante: String(perfil?.full_name ?? "Cliente Jurii"),
      documentoDoContratante: documento,
      valorEmCentavos: valor,
      // A primeira cobrança vence quando o teste acaba: assinar durante o
      // teste é deixar o pagamento pronto, e não abrir mão dos dias que
      // faltam.
      primeiroVencimentoIso:
        assinatura.trial_ends_at == null
          ? new Date().toISOString()
          : String(assinatura.trial_ends_at),
      descricao: `Jurii ${plano?.name ?? assinatura.plan_code} (${anual ? "anual" : "mensal"})`,
    });
    redirect(sessao.url);
  } catch (erro) {
    // `redirect` do Next funciona lançando: relançar é obrigatório, senão o
    // catch engole a navegação e a pessoa fica na tela sem entender.
    if (erro instanceof Error && erro.message === "NEXT_REDIRECT") throw erro;
    if (
      typeof erro === "object" &&
      erro !== null &&
      "digest" in erro &&
      String((erro as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT")
    ) {
      throw erro;
    }
    console.error("checkout falhou", erro);
    redirect(
      `${voltar}?erro=${encodeURIComponent("Não foi possível abrir o pagamento agora. Tente de novo em instantes.")}`,
    );
  }
}
