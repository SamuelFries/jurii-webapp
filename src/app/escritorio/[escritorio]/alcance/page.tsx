import { PainelDeAlcance } from "@/components/painel-de-alcance";
import { contextoLogado, exigeEscritorio } from "@/lib/contexto";

export const dynamic = "force-dynamic";

/** O painel "Seu alcance" do escritório, espelho da tela do app. */
export default async function AlcanceDoEscritorio({
  params,
  searchParams,
}: {
  params: Promise<{ escritorio: string }>;
  searchParams: Promise<{ dias?: string }>;
}) {
  const { escritorio: escritorioId } = await params;
  const { dias } = await searchParams;
  const contexto = await contextoLogado();
  const escritorio = exigeEscritorio(contexto, escritorioId);
  const janela = dias === "7" ? 7 : 30;

  return (
      <div className="pagina-de-trabalho">
        <div className="miolo" style={{ maxWidth: 720 }}>
          <h1 style={{ marginTop: 0 }}>Alcance de {escritorio.nome}</h1>
          <p className="subtitulo">
            Quem viu o escritório na busca, quem abriu o perfil e quem chamou.
          </p>
          {/* O base leva o id do vínculo conferido, não o valor cru da rota:
              assim os links de janela (7 ou 30 dias) ficam no escritório
              que o banco autorizou. */}
          <PainelDeAlcance
            supabase={contexto.supabase}
            tipo="law_firm"
            id={escritorio.id}
            janela={janela}
            base={`/escritorio/${escritorio.id}/alcance`}
          />
        </div>
      </div>
  );
}
