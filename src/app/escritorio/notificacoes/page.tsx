import { ListaDeNotificacoes } from "@/components/lista-de-notificacoes";
import { contextoLogado, exigeEscritorio } from "@/lib/contexto";

export const dynamic = "force-dynamic";

export default async function PaginaDeNotificacoesDoEscritorio() {
  const contexto = await contextoLogado();
  const escritorio = exigeEscritorio(contexto);
  return (
      <div className="pagina-de-trabalho"><div className="miolo">
      <ListaDeNotificacoes
        supabase={contexto.supabase}
        escopo="firm"
        lawFirmId={escritorio.id}
        fluxo="escritorio"
        voltar="/escritorio/notificacoes"
      />
      </div></div>
  );
}
