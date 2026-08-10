import { Casca } from "@/components/casca";
import { Chat } from "@/components/chat";
import { carregaMensagens } from "@/lib/chat-servidor";
import { contextoLogado } from "@/lib/contexto";

export const dynamic = "force-dynamic";

export default async function PaginaDeChatDoCliente({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const contexto = await contextoLogado();
  const mensagens = await carregaMensagens(
    contexto.supabase,
    id,
    contexto.usuario.id,
  );

  return (
    <Casca fluxo="cliente" fluxos={contexto.fluxos} caminhoAtivo="/conversas">
      <Chat
        conversaId={id}
        meuId={contexto.usuario.id}
        senderType="client"
        mensagensIniciais={mensagens}
      />
    </Casca>
  );
}
