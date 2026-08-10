import { Casca } from "@/components/casca";
import { DetalheDoCaso } from "@/components/detalhe-do-caso";
import { contextoLogado } from "@/lib/contexto";

export const dynamic = "force-dynamic";

export default async function PaginaDeCasoDoCliente({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { id } = await params;
  const { erro } = await searchParams;
  const contexto = await contextoLogado();

  return (
    <Casca fluxo="cliente" fluxos={contexto.fluxos} caminhoAtivo="/casos">
      <DetalheDoCaso
        supabase={contexto.supabase}
        casoId={id}
        voltarPara={`/casos/${id}`}
        listaHref="/casos"
        erro={erro}
      />
    </Casca>
  );
}
