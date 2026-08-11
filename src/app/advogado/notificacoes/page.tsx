import { CascaDeTrabalho } from "@/components/casca-de-trabalho";
import { ListaDeNotificacoes } from "@/components/lista-de-notificacoes";
import { contextoLogado, exigeAdvogado } from "@/lib/contexto";

export const dynamic = "force-dynamic";

export default async function NotificacoesDoAdvogado() {
  const contexto = await contextoLogado();
  exigeAdvogado(contexto);
  return (
    <CascaDeTrabalho
      fluxo="advogado"
      fluxos={contexto.fluxos}
      caminhoAtivo="/advogado/notificacoes"
    >
      <div className="pagina-de-trabalho">
        <div className="miolo">
          <ListaDeNotificacoes
            supabase={contexto.supabase}
            escopo="lawyer"
            fluxo="advogado"
            voltar="/advogado/notificacoes"
          />
        </div>
      </div>
    </CascaDeTrabalho>
  );
}
