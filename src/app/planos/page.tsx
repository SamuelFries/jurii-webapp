import { assinaturaDaLinha, planoDaLinha } from "@/lib/licenca";
import { clienteDoServidor } from "@/lib/supabase/servidor";

import { GradeDePlanos } from "./grade";

export const dynamic = "force-dynamic";

export default async function PaginaDePlanos({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  const supabase = await clienteDoServidor();

  // Mesmas leituras do app: planos ativos em ordem, e a assinatura de quem
  // chama (a RLS recorta as duas).
  const [{ data: linhasDePlano }, { data: linhaDeAssinatura }] =
    await Promise.all([
      supabase
        .from("law_firm_license_plans")
        .select(
          "code, name, max_lawyers, monthly_price_cents, annual_price_cents, sort_order",
        )
        .eq("is_active", true)
        .order("sort_order"),
      supabase
        .from("law_firm_license_subscriptions")
        .select("*, law_firm_license_plans(*)")
        .neq("status", "canceled")
        .maybeSingle(),
    ]);

  const planos = (linhasDePlano ?? []).map(planoDaLinha);
  const assinatura = linhaDeAssinatura
    ? assinaturaDaLinha(linhaDeAssinatura)
    : null;

  return (
    <main className="pagina">
      <div className="marca">
        jurii<span className="ouro">.</span>
      </div>
      <h1>Planos</h1>
      <p className="subtitulo">
        Todos os planos incluem tudo. O que muda é o tamanho da equipe.
      </p>

      {erro !== undefined && <p className="erro">{erro}</p>}

      <GradeDePlanos
        planos={planos}
        planoAtual={assinatura?.planCode ?? null}
        cicloAtual={assinatura?.billingCycle ?? null}
      />
    </main>
  );
}
