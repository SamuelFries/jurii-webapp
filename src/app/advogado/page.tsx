import { Casca } from "@/components/casca";
import { ListaDeConversas } from "@/components/lista-de-conversas";
import { contextoLogado, exigeAdvogado } from "@/lib/contexto";
import { conversaDaLinha } from "@/lib/dominio/conversas";

export const dynamic = "force-dynamic";

export default async function PaginaDeConversasDoAdvogado() {
  const contexto = await contextoLogado();
  exigeAdvogado(contexto);

  const { data } = await contexto.supabase.rpc(
    "fetch_conversations_for_current_user",
    { scope_value: "lawyer", law_firm_id_value: null },
  );

  const conversas = ((data as unknown[]) ?? []).map((linha) =>
    conversaDaLinha(linha as Record<string, unknown>),
  );

  return (
    <Casca fluxo="advogado" fluxos={contexto.fluxos} caminhoAtivo="/advogado">
      <h1>Mensagens</h1>
      <p className="subtitulo">Converse com clientes e acompanhe contatos.</p>
      <ListaDeConversas
        conversas={conversas}
        baseHref="/advogado/conversas"
        vazio="Quando um cliente falar com você, a conversa aparece aqui."
      />
    </Casca>
  );
}
