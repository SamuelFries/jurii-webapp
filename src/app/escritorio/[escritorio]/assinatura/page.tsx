import { MioloDaAssinatura } from "@/components/planos/miolo-da-assinatura";
import { contextoLogado, exigeEscritorio } from "@/lib/contexto";
import { ehGestor } from "@/lib/fluxos";

/** Sempre no servidor e sempre fresco: estado de assinatura em cache é como
 * a pessoa paga e continua vendo "pendente". */
export const dynamic = "force-dynamic";

/**
 * A assinatura DESTE escritório, dentro da mesa de trabalho.
 *
 * A guarda vale aqui porque a versão sem vínculo (o contratante que escolheu
 * o plano e espera a verificação) mudou de endereço para `/assinatura`: sem
 * escritório não há id para a rota, então este caminho nunca era o dele.
 */
export default async function AssinaturaDoEscritorio({
  params,
}: {
  params: Promise<{ escritorio: string }>;
}) {
  const { escritorio: escritorioId } = await params;
  const contexto = await contextoLogado();
  const escritorio = exigeEscritorio(contexto, escritorioId);

  return (
    <div className="pagina-de-trabalho">
      <div className="miolo" style={{ maxWidth: 560 }}>
        <MioloDaAssinatura
          supabase={contexto.supabase}
          escritorioId={escritorio.id}
          gestor={ehGestor(escritorio)}
        />
      </div>
    </div>
  );
}
