import { ListaDeNotificacoes } from "@/components/lista-de-notificacoes";
import { contextoLogado, exigeEscritorio } from "@/lib/contexto";

export const dynamic = "force-dynamic";

export default async function PaginaDeNotificacoesDoEscritorio({
  params,
}: {
  params: Promise<{ escritorio: string }>;
}) {
  const { escritorio: escritorioId } = await params;
  const contexto = await contextoLogado();
  const escritorio = exigeEscritorio(contexto, escritorioId);
  return (
      <div className="pagina-de-trabalho"><div className="miolo">
      <ListaDeNotificacoes
        supabase={contexto.supabase}
        escopo="firm"
        lawFirmId={escritorio.id}
        fluxo="escritorio"
        voltar={`/escritorio/${escritorioId}/notificacoes`}
      />
      </div></div>
  );
}
