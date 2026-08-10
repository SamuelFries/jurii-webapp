import { Casca } from "@/components/casca";
import { ListaDeNotificacoes } from "@/components/lista-de-notificacoes";
import { contextoLogado } from "@/lib/contexto";

export const dynamic = "force-dynamic";

export default async function PaginaDeNotificacoesDoCliente() {
  const contexto = await contextoLogado();
  return (
    <Casca
      fluxo="cliente"
      fluxos={contexto.fluxos}
      caminhoAtivo="/notificacoes"
    >
      <ListaDeNotificacoes
        supabase={contexto.supabase}
        escopo="client"
        fluxo="cliente"
        voltar="/notificacoes"
      />
    </Casca>
  );
}
