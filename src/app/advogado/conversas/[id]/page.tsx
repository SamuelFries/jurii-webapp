import Link from "next/link";

import { Chat } from "@/components/chat";
import { ModeracaoDaConversa } from "@/components/moderacao-da-conversa";
import { PainelDeMensagens } from "@/components/paineis";
import { ProporCaso } from "@/components/propor-caso";
import { carregaBloqueio, carregaConversa, carregaMensagens } from "@/lib/chat-servidor";
import { contextoLogado, exigeAdvogado } from "@/lib/contexto";
import { conversaParaTela } from "@/lib/busca/mapeia";
import { conversaDaLinha } from "@/lib/dominio/conversas";

export const dynamic = "force-dynamic";

export default async function ChatDoAdvogado({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  const { id } = await params;
  const { ok, erro } = await searchParams;
  const contexto = await contextoLogado();
  exigeAdvogado(contexto);

  const [conversasRes, mensagens, bloqueio] = await Promise.all([
    contexto.supabase.rpc("fetch_conversations_for_current_user", {
      scope_value: "lawyer",
      law_firm_id_value: null,
    }),
    carregaMensagens(contexto.supabase, id, contexto.usuario.id),
    carregaBloqueio(contexto.supabase, id),
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
        {/* Acoes no CABECALHO, como no app (la sao icones da barra
            superior). Empilhadas acima das mensagens, elas empurravam a
            conversa para baixo e competiam com ela. */}
        <span className="acoes-do-chat">
          <ProporCaso conversaId={id} voltar={`/advogado/conversas/${id}`} />
          <ModeracaoDaConversa
            conversaId={id}
            voltar={`/advogado/conversas/${id}`}
            bloqueada={bloqueio.bloqueada}
            bloqueadaPorMim={bloqueio.porMim}
          />
        </span>
      </div>
      {erro !== undefined && <p className="erro">{erro}</p>}
      {ok === "proposta" && (
        <p className="aviso-bom">
          Solicitação enviada. O cliente decide em Meus casos; quando
          aceitar, o caso aparece na sua carteira.
        </p>
      )}
      <Chat
        conversaId={id}
        meuId={contexto.usuario.id}
        senderType="lawyer"
        mensagensIniciais={mensagens}
        bloqueada={bloqueio.bloqueada}
      />
    </PainelDeMensagens>
  );
}
