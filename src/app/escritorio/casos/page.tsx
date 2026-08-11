import { Casca } from "@/components/casca";
import { CasosDoEscritorioComBusca } from "@/components/listas/casos-do-escritorio-com-busca";
import { contextoLogado, exigeEscritorio } from "@/lib/contexto";
import { casoDoEscritorioParaTela } from "@/lib/busca/mapeia";
import { casoDoEscritorioDaLinha } from "@/lib/dominio/casos";

export const dynamic = "force-dynamic";

export default async function PaginaDeCasosDoEscritorio() {
  const contexto = await contextoLogado();
  const escritorio = exigeEscritorio(contexto);

  const { data } = await contexto.supabase.rpc("fetch_law_firm_cases", {
    law_firm_id_value: escritorio.id,
  });

  const casos = ((data as unknown[]) ?? []).map((linha) =>
    casoDoEscritorioParaTela(
      casoDoEscritorioDaLinha(linha as Record<string, unknown>),
    ),
  );

  return (
    <Casca
      fluxo="escritorio"
      fluxos={contexto.fluxos}
      caminhoAtivo="/escritorio/casos"
    >
      <h1>Casos</h1>
      <p className="subtitulo">
        Visão geral dos casos por cliente e advogado responsável.
      </p>
      <CasosDoEscritorioComBusca casos={casos} />
    </Casca>
  );
}
