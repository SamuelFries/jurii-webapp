import { CasosDoEscritorioComBusca } from "@/components/listas/casos-do-escritorio-com-busca";
import { PainelDeCasos } from "@/components/paineis";
import { contextoLogado, exigeEscritorio } from "@/lib/contexto";
import { casoDoEscritorioParaTela } from "@/lib/busca/mapeia";
import { casoDoEscritorioDaLinha } from "@/lib/dominio/casos";

export const dynamic = "force-dynamic";

export default async function CasosDoEscritorio() {
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
    <PainelDeCasos
      fluxo="escritorio"
      fluxos={contexto.fluxos}
      caminhoAtivo="/escritorio/casos"
      titulo="Casos"
      subtitulo="A carteira do escritório, por cliente e responsável."
      lista={<CasosDoEscritorioComBusca casos={casos} />}
    >
      <div className="painel-vazio">
        <p>
          Escolha um caso ao lado para ver a linha do tempo, atribuir o
          responsável e cuidar do processo.
        </p>
      </div>
    </PainelDeCasos>
  );
}
