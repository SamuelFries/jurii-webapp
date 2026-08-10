import { Casca } from "@/components/casca";
import { DetalheDoCaso } from "@/components/detalhe-do-caso";
import { contextoLogado, exigeAdvogado } from "@/lib/contexto";

export const dynamic = "force-dynamic";

export default async function PaginaDeCasoDoAdvogado({
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

  return (
    <Casca
      fluxo="advogado"
      fluxos={contexto.fluxos}
      caminhoAtivo="/advogado/casos"
    >
      <DetalheDoCaso
        supabase={contexto.supabase}
        casoId={id}
        voltarPara={`/advogado/casos/${id}`}
        listaHref="/advogado/casos"
        erro={erro}
      />
    </Casca>
  );
}
