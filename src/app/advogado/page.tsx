import { Casca } from "@/components/casca";
import { ConversasComBusca } from "@/components/listas/conversas-com-busca";
import { contextoLogado, exigeAdvogado } from "@/lib/contexto";
import { conversaParaTela } from "@/lib/busca/mapeia";
import { conversaDaLinha } from "@/lib/dominio/conversas";

export const dynamic = "force-dynamic";

export default async function PaginaDeConversasDoAdvogado() {
  const contexto = await contextoLogado();
  exigeAdvogado(contexto);

  const { data } = await contexto.supabase.rpc(
    "fetch_conversations_for_current_user",
    { scope_value: "lawyer", law_firm_id_value: null },
  );

  const agora = new Date();
  const conversas = ((data as unknown[]) ?? []).map((linha) =>
    conversaParaTela(conversaDaLinha(linha as Record<string, unknown>), agora),
  );

  return (
    <Casca fluxo="advogado" fluxos={contexto.fluxos} caminhoAtivo="/advogado">
      <h1>Mensagens</h1>
      <p className="subtitulo">Converse com clientes e acompanhe contatos.</p>
      <ConversasComBusca
        conversas={conversas}
        baseHref="/advogado/conversas"
        vazio="Quando um cliente falar com você, a conversa aparece aqui."
        placeholder="Buscar por cliente ou área"
      />
    </Casca>
  );
}
