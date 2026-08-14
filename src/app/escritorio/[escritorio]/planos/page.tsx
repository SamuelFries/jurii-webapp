import { MioloDePlanos } from "@/components/planos/miolo-de-planos";
import { contextoLogado, exigeEscritorio } from "@/lib/contexto";

export const dynamic = "force-dynamic";

/**
 * Trocar o plano DE UM ESCRITÓRIO que já existe, dentro da mesa de trabalho.
 *
 * Aqui a guarda vale, ao contrário do que valia quando esta tela também
 * atendia o contratante sem banca: o funil pré-escritório mudou de endereço
 * para `/planos`, porque quem ainda não tem escritório não tem id para pôr
 * na rota e a página nunca era alcançada por ele.
 */
export default async function PlanosDoEscritorio({
  params,
  searchParams,
}: {
  params: Promise<{ escritorio: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { escritorio: escritorioId } = await params;
  const { erro } = await searchParams;
  const contexto = await contextoLogado();
  const escritorio = exigeEscritorio(contexto, escritorioId);

  return (
    <div className="pagina-de-trabalho">
      <div className="miolo" style={{ maxWidth: 560 }}>
        <MioloDePlanos
          supabase={contexto.supabase}
          escritorioId={escritorio.id}
          erro={erro}
        />
      </div>
    </div>
  );
}
