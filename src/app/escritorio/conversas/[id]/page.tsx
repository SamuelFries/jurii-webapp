import { Casca } from "@/components/casca";
import { Chat } from "@/components/chat";
import { carregaMensagens } from "@/lib/chat-servidor";
import { contextoLogado, exigeEscritorio } from "@/lib/contexto";

export const dynamic = "force-dynamic";

export default async function PaginaDeChatDoEscritorio({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const contexto = await contextoLogado();
  exigeEscritorio(contexto);

  const mensagens = await carregaMensagens(
    contexto.supabase,
    id,
    contexto.usuario.id,
  );

  return (
    <Casca
      fluxo="escritorio"
      fluxos={contexto.fluxos}
      caminhoAtivo="/escritorio"
    >
      <Chat
        conversaId={id}
        meuId={contexto.usuario.id}
        senderType="lawyer"
        mensagensIniciais={mensagens}
      />
    </Casca>
  );
}
