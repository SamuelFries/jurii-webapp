import Link from "next/link";

import { CascaDeTrabalho } from "@/components/casca-de-trabalho";
import { contextoLogado } from "@/lib/contexto";
import { assinaturaDaLinha, planoDaLinha } from "@/lib/licenca";

import { GradeDePlanos } from "./grade";

export const dynamic = "force-dynamic";

export default async function PaginaDePlanos({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  const contexto = await contextoLogado();

  const [{ data: linhasDePlano }, { data: linhaDeAssinatura }] =
    await Promise.all([
      contexto.supabase
        .from("law_firm_license_plans")
        .select(
          "code, name, max_lawyers, monthly_price_cents, annual_price_cents, sort_order",
        )
        .eq("is_active", true)
        .order("sort_order"),
      contexto.supabase
        .from("law_firm_license_subscriptions")
        .select("*, law_firm_license_plans(*)")
        .neq("status", "canceled")
        .maybeSingle(),
    ]);

  const planos = (linhasDePlano ?? []).map(planoDaLinha);
  const assinatura = linhaDeAssinatura
    ? assinaturaDaLinha(linhaDeAssinatura)
    : null;

  const conteudo = (
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
      />
    </>
  );

  if (contexto.fluxos.escritorio !== null) {
    return (
      <CascaDeTrabalho
        fluxo="escritorio"
        fluxos={contexto.fluxos}
        caminhoAtivo="/escritorio/assinatura"
      >
        <div className="pagina-de-trabalho">
          <div className="miolo" style={{ maxWidth: 560 }}>
            {conteudo}
          </div>
        </div>
      </CascaDeTrabalho>
    );
  }

  return (
    <main className="pagina">
      <Link href="/inicio" className="marca marca-pequena">
        jurii<span className="ouro">.</span>
      </Link>
      {conteudo}
    </main>
  );
}
