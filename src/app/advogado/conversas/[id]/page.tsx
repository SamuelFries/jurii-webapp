import { Casca } from "@/components/casca";
import { Chat } from "@/components/chat";
import { carregaMensagens } from "@/lib/chat-servidor";
import { contextoLogado, exigeAdvogado } from "@/lib/contexto";

export const dynamic = "force-dynamic";

export default async function PaginaDeChatDoAdvogado({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const contexto = await contextoLogado();
  exigeAdvogado(contexto);

  const mensagens = await carregaMensagens(
    contexto.supabase,
    id,
    contexto.usuario.id,
  );

  return (
    <Casca fluxo="advogado" fluxos={contexto.fluxos} caminhoAtivo="/advogado">
      <Chat
        conversaId={id}
        meuId={contexto.usuario.id}
        senderType="lawyer"
        mensagensIniciais={mensagens}
      />
    </Casca>
  );
}
