import { PainelDeAlcance } from "@/components/painel-de-alcance";
import { contextoLogado, exigeAdvogado } from "@/lib/contexto";

export const dynamic = "force-dynamic";

/** O painel "Seu alcance" do advogado, espelho da tela do app. */
export default async function AlcanceDoAdvogado({
  searchParams,
}: {
  searchParams: Promise<{ dias?: string }>;
}) {
  const { dias } = await searchParams;
  const contexto = await contextoLogado();
  exigeAdvogado(contexto);
  // Só as janelas do app: qualquer outra coisa na URL vira o padrão.
  const janela = dias === "7" ? 7 : 30;

  return (
      <div className="pagina-de-trabalho">
        <div className="miolo" style={{ maxWidth: 720 }}>
          <h1 style={{ marginTop: 0 }}>Seu alcance</h1>
          <p className="subtitulo">
            Quem viu você na busca, quem abriu o perfil e quem chamou.
          </p>
          <PainelDeAlcance
            supabase={contexto.supabase}
            tipo="lawyer"
            id={contexto.usuario.id}
            janela={janela}
            base="/advogado/alcance"
          />
        </div>
      </div>
  );
}
