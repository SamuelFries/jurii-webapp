import Link from "next/link";

import { Casca } from "@/components/casca";
import { Chat } from "@/components/chat";
import { ModeracaoDaConversa } from "@/components/moderacao-da-conversa";
import { carregaBloqueio, carregaConversa, carregaMensagens } from "@/lib/chat-servidor";
import { contextoLogado } from "@/lib/contexto";

export const dynamic = "force-dynamic";

export default async function PaginaDeChatDoCliente({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const contexto = await contextoLogado();
  const [mensagens, conversa, bloqueio] = await Promise.all([
    carregaMensagens(contexto.supabase, id, contexto.usuario.id),
    carregaConversa(contexto.supabase, id, "client", null),
    carregaBloqueio(contexto.supabase, id),
  ]);

  return (
    <Casca fluxo="cliente" fluxos={contexto.fluxos} caminhoAtivo="/conversas">
      <div className="cabecalho-do-chat">
        <Link href="/conversas">← Conversas</Link>
        <span className="nome">{conversa?.titulo ?? "Conversa"}</span>
        {conversa !== null && conversa.especialidade !== "" && (
          <span className="area">{conversa.especialidade}</span>
        )}
        <ModeracaoDaConversa
          conversaId={id}
          voltar={`/conversas/${id}`}
          bloqueada={bloqueio.bloqueada}
          bloqueadaPorMim={bloqueio.porMim}
        />
      </div>
      <Chat
        conversaId={id}
        meuId={contexto.usuario.id}
        senderType="client"
        mensagensIniciais={mensagens}
        bloqueada={bloqueio.bloqueada}
      />
    </Casca>
  );
}
