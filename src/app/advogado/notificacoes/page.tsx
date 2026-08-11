import { CascaDeTrabalho } from "@/components/casca-de-trabalho";
import { ListaDeNotificacoes } from "@/components/lista-de-notificacoes";
import { contextoLogado, exigeAdvogado } from "@/lib/contexto";

export const dynamic = "force-dynamic";

export default async function NotificacoesDoAdvogado({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  const { ok, erro } = await searchParams;
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
          {erro !== undefined && <p className="erro">{erro}</p>}
          {ok === "convite-aceito" && (
            <p className="aviso-bom">
              Você entrou na equipe. O painel do escritório já aparece na
              troca de área, no topo da barra lateral.
            </p>
          )}
          {ok === "convite-recusado" && (
            <p className="aviso-bom">Convite recusado.</p>
          )}
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
