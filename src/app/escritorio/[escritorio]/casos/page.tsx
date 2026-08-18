import { CasosDoEscritorioComBusca } from "@/components/listas/casos-do-escritorio-com-busca";
import { PainelDeCasos } from "@/components/paineis";
import { contextoLogado, exigeEscritorio } from "@/lib/contexto";
import { casoDoEscritorioParaTela } from "@/lib/busca/mapeia";
import { ResumoDaCarteira } from "@/components/resumo-da-carteira";
import { casoDoEscritorioDaLinha } from "@/lib/dominio/casos";

export const dynamic = "force-dynamic";

export default async function CasosDoEscritorio({
  params,
}: {
  params: Promise<{ escritorio: string }>;
}) {
  const { escritorio: escritorioId } = await params;
  const contexto = await contextoLogado();
  const escritorio = exigeEscritorio(contexto, escritorioId);

  const { data } = await contexto.supabase.rpc("fetch_law_firm_cases", {
    law_firm_id_value: escritorio.id,
  });
  const casos = ((data as unknown[]) ?? []).map((linha) =>
    casoDoEscritorioParaTela(
      casoDoEscritorioDaLinha(linha as Record<string, unknown>),
    ),
  );

  return (
    <PainelDeCasos
      titulo="Casos"
      subtitulo="A carteira do escritório, por cliente e responsável."
      lista={
        <CasosDoEscritorioComBusca
          casos={casos}
          baseHref={`/escritorio/${escritorio.id}/casos`}
        />
      }
    >
      <ResumoDaCarteira
        casos={casos}
        baseHref={`/escritorio/${escritorio.id}/casos`}
      />
    </PainelDeCasos>
  );
}
