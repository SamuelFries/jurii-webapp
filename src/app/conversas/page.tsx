import { Casca } from "@/components/casca";
import { ListaDeConversas } from "@/components/lista-de-conversas";
import { contextoLogado } from "@/lib/contexto";
import { conversaDaLinha } from "@/lib/dominio/conversas";

export const dynamic = "force-dynamic";

export default async function PaginaDeConversasDoCliente() {
  const contexto = await contextoLogado();

  const { data } = await contexto.supabase.rpc(
    "fetch_conversations_for_current_user",
    { scope_value: "client", law_firm_id_value: null },
  );

  const conversas = ((data as unknown[]) ?? []).map((linha) =>
    conversaDaLinha(linha as Record<string, unknown>),
  );

  return (
    <Casca fluxo="cliente" fluxos={contexto.fluxos} caminhoAtivo="/conversas">
      <h1>Conversas</h1>
      <p className="subtitulo">Acompanhe seus atendimentos jurídicos.</p>
      <ListaDeConversas
        conversas={conversas}
        baseHref="/conversas"
        vazio="Quando você falar com um escritório ou advogado, a conversa aparece aqui. Comece pela busca no Início."
      />
    </Casca>
  );
}
