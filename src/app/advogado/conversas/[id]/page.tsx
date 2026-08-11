import Link from "next/link";

import { Chat } from "@/components/chat";
import { PainelDeMensagens } from "@/components/paineis";
import { carregaConversa, carregaMensagens } from "@/lib/chat-servidor";
import { contextoLogado, exigeAdvogado } from "@/lib/contexto";
import { conversaParaTela } from "@/lib/busca/mapeia";
import { conversaDaLinha } from "@/lib/dominio/conversas";

export const dynamic = "force-dynamic";

export default async function ChatDoAdvogado({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const contexto = await contextoLogado();
  exigeAdvogado(contexto);

  const [conversasRes, mensagens] = await Promise.all([
    contexto.supabase.rpc("fetch_conversations_for_current_user", {
      scope_value: "lawyer",
      law_firm_id_value: null,
    }),
    carregaMensagens(contexto.supabase, id, contexto.usuario.id),
  ]);

  const agora = new Date();
  const conversas = ((conversasRes.data as unknown[]) ?? []).map((linha) =>
    conversaParaTela(conversaDaLinha(linha as Record<string, unknown>), agora),
  );
  const conversa =
    conversas.find((c) => c.id === id) ??
    (await carregaConversa(contexto.supabase, id, "lawyer", null).then(
      (c) => c && conversaParaTela(c, agora),
    ));

  return (
    <PainelDeMensagens
      fluxo="advogado"
      fluxos={contexto.fluxos}
      caminhoAtivo="/advogado"
      titulo="Mensagens"
      subtitulo="Converse com clientes e acompanhe contatos."
      conversas={conversas}
      baseHref="/advogado/conversas"
      vazio="Quando um cliente falar com você, a conversa aparece aqui."
      placeholder="Buscar por cliente ou área"
      ativoId={id}
      comDetalhe
    >
      <div className="cabecalho-do-chat">
        <Link href="/advogado">← Conversas</Link>
        <span className="nome">{conversa?.titulo ?? "Conversa"}</span>
        {conversa != null && conversa.especialidade !== "" && (
          <span className="area">{conversa.especialidade}</span>
        )}
      </div>
      <Chat
        conversaId={id}
        meuId={contexto.usuario.id}
        senderType="lawyer"
        mensagensIniciais={mensagens}
      />
    </PainelDeMensagens>
  );
}
