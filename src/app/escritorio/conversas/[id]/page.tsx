import Link from "next/link";

import { Casca } from "@/components/casca";
import { Chat } from "@/components/chat";
import { carregaConversa, carregaMensagens } from "@/lib/chat-servidor";
import { contextoLogado, exigeEscritorio } from "@/lib/contexto";

export const dynamic = "force-dynamic";

export default async function PaginaDeChatDoEscritorio({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const contexto = await contextoLogado();
  const escritorio = exigeEscritorio(contexto);

  // A conversa pode morar em qualquer um dos dois segmentos; o título vem
  // de onde ela estiver.
  const [mensagens, deClientes] = await Promise.all([
    carregaMensagens(contexto.supabase, id, contexto.usuario.id),
    carregaConversa(contexto.supabase, id, "firmClient", escritorio.id),
  ]);
  const conversa =
    deClientes ??
    (await carregaConversa(contexto.supabase, id, "firmTeam", escritorio.id));

  return (
    <Casca
      fluxo="escritorio"
      fluxos={contexto.fluxos}
      caminhoAtivo="/escritorio/mensagens"
    >
      <div className="cabecalho-do-chat">
        <Link href="/escritorio/mensagens">← Mensagens</Link>
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
