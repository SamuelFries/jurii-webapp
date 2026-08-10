import { Casca } from "@/components/casca";
import { ListaDeNotificacoes } from "@/components/lista-de-notificacoes";
import { contextoLogado, exigeEscritorio } from "@/lib/contexto";

export const dynamic = "force-dynamic";

export default async function PaginaDeNotificacoesDoEscritorio() {
  const contexto = await contextoLogado();
  const escritorio = exigeEscritorio(contexto);
  return (
    <Casca
      fluxo="escritorio"
      fluxos={contexto.fluxos}
      caminhoAtivo="/escritorio/notificacoes"
    >
      <ListaDeNotificacoes
        supabase={contexto.supabase}
        escopo="firm"
        lawFirmId={escritorio.id}
        fluxo="escritorio"
        voltar="/escritorio/notificacoes"
      />
    </Casca>
  );
}
