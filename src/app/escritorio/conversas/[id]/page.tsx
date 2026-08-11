import Link from "next/link";

import { Chat } from "@/components/chat";
import { PainelDeMensagens } from "@/components/paineis";
import { ProporCaso } from "@/components/propor-caso";
import { carregaConversa, carregaMensagens } from "@/lib/chat-servidor";
import { contextoLogado, exigeEscritorio } from "@/lib/contexto";
import { conversaParaTela } from "@/lib/busca/mapeia";
import { conversaDaLinha } from "@/lib/dominio/conversas";

export const dynamic = "force-dynamic";

export default async function ChatDoEscritorio({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ aba?: string; ok?: string; erro?: string }>;
}) {
  const { id } = await params;
  const { aba, ok, erro } = await searchParams;
  const contexto = await contextoLogado();
  const escritorio = exigeEscritorio(contexto);
  const segmentoEquipe = aba === "equipe";

  const [conversasRes, mensagens] = await Promise.all([
    contexto.supabase.rpc("fetch_conversations_for_current_user", {
      scope_value: segmentoEquipe ? "firmTeam" : "firmClient",
      law_firm_id_value: escritorio.id,
    }),
    carregaMensagens(contexto.supabase, id, contexto.usuario.id),
  ]);

  const agora = new Date();
  const conversas = ((conversasRes.data as unknown[]) ?? []).map((linha) =>
    conversaParaTela(conversaDaLinha(linha as Record<string, unknown>), agora),
  );
  const conversa =
    conversas.find((c) => c.id === id) ??
    (await carregaConversa(
      contexto.supabase,
      id,
      segmentoEquipe ? "firmClient" : "firmTeam",
      escritorio.id,
    ).then((c) => c && conversaParaTela(c, agora)));

  const sufixo = segmentoEquipe ? "?aba=equipe" : "";

  return (
    <PainelDeMensagens
      fluxo="escritorio"
      fluxos={contexto.fluxos}
      caminhoAtivo="/escritorio/mensagens"
      titulo="Mensagens"
      subtitulo={`Conversas de ${escritorio.nome}.`}
      conversas={conversas}
      baseHref="/escritorio/conversas"
      vazio="Nenhuma conversa neste segmento ainda."
      placeholder={
        segmentoEquipe
          ? "Buscar por pessoa da equipe"
          : "Buscar por cliente ou advogado"
      }
      rotuloNaoLidas="Ninguém abriu"
      ativoId={id}
      hrefSufixo={sufixo}
      comDetalhe
      cabecalhoDaLista={
        <nav
          className="troca-de-fluxo"
          aria-label="Segmento"
          style={{ marginBottom: 12 }}
        >
          <Link
            href="/escritorio/mensagens"
            className={segmentoEquipe ? "" : "ativa"}
          >
            Clientes
          </Link>
          <Link
            href="/escritorio/mensagens?aba=equipe"
            className={segmentoEquipe ? "ativa" : ""}
          >
            Equipe
          </Link>
        </nav>
      }
    >
      <div className="cabecalho-do-chat">
        <Link href={`/escritorio/mensagens${sufixo}`}>← Mensagens</Link>
        <span className="nome">{conversa?.titulo ?? "Conversa"}</span>
        {conversa != null && conversa.especialidade !== "" && (
          <span className="area">{conversa.especialidade}</span>
        )}
      </div>
      {erro !== undefined && <p className="erro">{erro}</p>}
      {ok === "proposta" && (
        <p className="aviso-bom">
          Solicitação enviada. O cliente decide em Meus casos; quando
          aceitar, o caso entra na carteira do escritório.
        </p>
      )}
      {!segmentoEquipe && (
        <ProporCaso
          conversaId={id}
          voltar={`/escritorio/conversas/${id}${sufixo}`}
        />
      )}
      <Chat
        conversaId={id}
        meuId={contexto.usuario.id}
        senderType="lawyer"
        mensagensIniciais={mensagens}
      />
    </PainelDeMensagens>
  );
}
