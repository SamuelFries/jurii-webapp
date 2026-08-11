import { CasosDoAdvogadoComBusca } from "@/components/listas/casos-do-advogado-com-busca";
import { DetalheDoCaso } from "@/components/detalhe-do-caso";
import { PainelDeCasos } from "@/components/paineis";
import { contextoLogado, exigeAdvogado } from "@/lib/contexto";
import { casoDoAdvogadoParaTela } from "@/lib/busca/mapeia";
import { casoDoAdvogadoDaLinha } from "@/lib/dominio/casos";

export const dynamic = "force-dynamic";

export default async function CasoDoAdvogado({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { id } = await params;
  const { erro } = await searchParams;
  const contexto = await contextoLogado();
  exigeAdvogado(contexto);

  const { data } = await contexto.supabase.rpc("fetch_lawyer_cases");
  const casos = ((data as unknown[]) ?? []).map((linha) =>
    casoDoAdvogadoParaTela(casoDoAdvogadoDaLinha(linha as Record<string, unknown>)),
  );

  return (
    <PainelDeCasos
      fluxo="advogado"
      fluxos={contexto.fluxos}
      caminhoAtivo="/advogado/casos"
      titulo="Casos"
      subtitulo="O caso nasce na conversa: proponha pelo chat."
      lista={<CasosDoAdvogadoComBusca casos={casos} ativoId={id} />}
      comDetalhe
    >
      <DetalheDoCaso
        supabase={contexto.supabase}
        casoId={id}
        voltarPara={`/advogado/casos/${id}`}
        listaHref="/advogado/casos"
        erro={erro}
      />
    </PainelDeCasos>
  );
}
