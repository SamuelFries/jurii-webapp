import Link from "next/link";

import { Casca } from "@/components/casca";
import { Chat } from "@/components/chat";
import { carregaConversa, carregaMensagens } from "@/lib/chat-servidor";
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

  const [mensagens, conversa] = await Promise.all([
    carregaMensagens(contexto.supabase, id, contexto.usuario.id),
    carregaConversa(contexto.supabase, id, "lawyer", null),
  ]);

  return (
    <Casca fluxo="advogado" fluxos={contexto.fluxos} caminhoAtivo="/advogado">
      <div className="cabecalho-do-chat">
        <Link href="/advogado">← Conversas</Link>
        <span className="nome">{conversa?.titulo ?? "Conversa"}</span>
        {conversa !== null && conversa.especialidade !== "" && (
          <span className="area">{conversa.especialidade}</span>
        )}
      </div>
      <Chat
        conversaId={id}
        meuId={contexto.usuario.id}
        senderType="lawyer"
        mensagensIniciais={mensagens}
      />
    </Casca>
  );
}
