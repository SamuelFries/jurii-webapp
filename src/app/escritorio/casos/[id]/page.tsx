import { CasosDoEscritorioComBusca } from "@/components/listas/casos-do-escritorio-com-busca";
import { DetalheDoCaso } from "@/components/detalhe-do-caso";
import { PainelDeCasos } from "@/components/paineis";
import { contextoLogado, exigeEscritorio } from "@/lib/contexto";
import { casoDoEscritorioParaTela } from "@/lib/busca/mapeia";
import { casoDoEscritorioDaLinha } from "@/lib/dominio/casos";

export const dynamic = "force-dynamic";

export default async function CasoDoEscritorio({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { id } = await params;
  const { erro } = await searchParams;
  const contexto = await contextoLogado();
  const escritorio = exigeEscritorio(contexto);

  const podeAtribuir = escritorio.papeis.some((papel) =>
    ["owner", "admin", "secretary"].includes(papel),
  );

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
      lista={<CasosDoEscritorioComBusca casos={casos} ativoId={id} />}
      comDetalhe
    >
      <DetalheDoCaso
        supabase={contexto.supabase}
        casoId={id}
        voltarPara={`/escritorio/casos/${id}`}
        listaHref="/escritorio/casos"
        erro={erro}
        escritorioId={escritorio.id}
        podeAtribuir={podeAtribuir}
      />
    </PainelDeCasos>
  );
}
