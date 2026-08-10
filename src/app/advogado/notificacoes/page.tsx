import { Casca } from "@/components/casca";
import { ListaDeNotificacoes } from "@/components/lista-de-notificacoes";
import { contextoLogado, exigeAdvogado } from "@/lib/contexto";

export const dynamic = "force-dynamic";

export default async function PaginaDeNotificacoesDoAdvogado() {
  const contexto = await contextoLogado();
  exigeAdvogado(contexto);
  return (
    <Casca
      fluxo="advogado"
      fluxos={contexto.fluxos}
      caminhoAtivo="/advogado/notificacoes"
    >
      <ListaDeNotificacoes
        supabase={contexto.supabase}
        escopo="lawyer"
        fluxo="advogado"
        voltar="/advogado/notificacoes"
      />
    </Casca>
  );
}
