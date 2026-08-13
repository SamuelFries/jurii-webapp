import { CascaDeTrabalho } from "@/components/casca-de-trabalho";
import { PainelDeAlcance } from "@/components/painel-de-alcance";
import { contextoLogado, exigeEscritorio } from "@/lib/contexto";

export const dynamic = "force-dynamic";

/** O painel "Seu alcance" do escritório, espelho da tela do app. */
export default async function AlcanceDoEscritorio({
  searchParams,
}: {
  searchParams: Promise<{ dias?: string }>;
}) {
  const { dias } = await searchParams;
  const contexto = await contextoLogado();
  const escritorio = exigeEscritorio(contexto);
  const janela = dias === "7" ? 7 : 30;

  return (
    <CascaDeTrabalho
      fluxo="escritorio"
      fluxos={contexto.fluxos}
      caminhoAtivo="/escritorio/alcance"
    >
      <div className="pagina-de-trabalho">
        <div className="miolo" style={{ maxWidth: 720 }}>
          <h1 style={{ marginTop: 0 }}>Alcance de {escritorio.nome}</h1>
          <p className="subtitulo">
            Quem viu o escritório na busca, quem abriu o perfil e quem chamou.
          </p>
          <PainelDeAlcance
            supabase={contexto.supabase}
            tipo="law_firm"
            id={escritorio.id}
            janela={janela}
            base="/escritorio/alcance"
          />
        </div>
      </div>
    </CascaDeTrabalho>
  );
}
