import { Casca } from "@/components/casca";
import { DetalheDoCaso } from "@/components/detalhe-do-caso";
import { contextoLogado, exigeEscritorio } from "@/lib/contexto";

export const dynamic = "force-dynamic";

export default async function PaginaDeCasoDoEscritorio({
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

  // Atribuição é papel de gestão, a mesma régua da RPC (sócio, admin,
  // secretária); a RPC recusa de qualquer jeito se a tela errar.
  const podeAtribuir = escritorio.papeis.some((papel) =>
    ["owner", "admin", "secretary"].includes(papel),
  );

  return (
    <Casca
      fluxo="escritorio"
      fluxos={contexto.fluxos}
      caminhoAtivo="/escritorio/casos"
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
    </Casca>
  );
}
