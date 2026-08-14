import type { SupabaseClient } from "@supabase/supabase-js";

import { assinaturaDaLinha, planoDaLinha } from "@/lib/licenca";

import { GradeDePlanos } from "./grade-de-planos";

/**
 * A tela de planos SEM a casca: o mesmo miolo serve aos dois momentos da
 * compra, e é por isso que ele mora aqui em vez de dentro de uma das rotas.
 *
 *  - `/planos`, sem escritório: a primeira licença, escolhida antes de a
 *    banca existir (é a licença que destrava o cadastro no app);
 *  - `/escritorio/{id}/planos`: a troca de plano de um escritório já de pé.
 *
 * A diferença entre os dois é só o `escritorioId`, que decide qual linha de
 * assinatura ler e o que o formulário manda para a ação.
 */
export async function MioloDePlanos({
  supabase,
  escritorioId,
  erro,
}: {
  supabase: SupabaseClient;
  /** Nulo na primeira licença, quando ainda não há escritório. */
  escritorioId: string | null;
  erro?: string;
}) {
  const assinaturaEm = supabase
    .from("law_firm_license_subscriptions")
    .select("*, law_firm_license_plans(*)")
    .neq("status", "canceled");

  const [{ data: linhasDePlano }, { data: linhaDeAssinatura }] =
    await Promise.all([
      supabase
        .from("law_firm_license_plans")
        .select(
          "code, name, max_lawyers, monthly_price_cents, annual_price_cents, sort_order",
        )
        .eq("is_active", true)
        .order("sort_order"),
      // O filtro é OBRIGATÓRIO nos dois casos: quem gerencia mais de uma
      // banca recebe da policy uma linha por escritório, e o maybeSingle
      // estouraria em vez de trazer a assinatura desta tela.
      //
      // Sem escritório, a linha certa é a LICENÇA NÃO GASTA (law_firm_id
      // nulo). Não filtrar era seguro enquanto a licença era por pessoa e só
      // havia uma; com a cobrança por escritório, quem já tem banca e
      // comprou a segunda licença tem duas linhas visíveis.
      (escritorioId === null
        ? assinaturaEm.is("law_firm_id", null)
        : assinaturaEm.eq("law_firm_id", escritorioId)
      ).maybeSingle(),
    ]);

  const planos = (linhasDePlano ?? []).map(planoDaLinha);
  const assinatura = linhaDeAssinatura
    ? assinaturaDaLinha(linhaDeAssinatura)
    : null;

  return (
    <>
      <h1>Planos</h1>
      <p className="subtitulo">
        Todos os planos incluem tudo. O que muda é o tamanho da equipe.
      </p>

      {erro !== undefined && <p className="erro">{erro}</p>}

      <GradeDePlanos
        planos={planos}
        planoAtual={assinatura?.planCode ?? null}
        cicloAtual={assinatura?.billingCycle ?? null}
        escritorioId={escritorioId}
      />
    </>
  );
}
