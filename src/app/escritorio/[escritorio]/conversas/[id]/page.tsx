import Link from "next/link";

import { Chat } from "@/components/chat";
import { ModeracaoDaConversa } from "@/components/moderacao-da-conversa";
import { PainelDeMensagens } from "@/components/paineis";
import { IndicarAdvogado } from "@/components/indicar-advogado";
import { ProporCaso } from "@/components/propor-caso";
import { carregaBloqueio, carregaConversa, carregaMensagens } from "@/lib/chat-servidor";
import { contextoLogado, exigeEscritorio } from "@/lib/contexto";
import { conversaParaTela } from "@/lib/busca/mapeia";
import { conversaDaLinha } from "@/lib/dominio/conversas";
import { membroDaLinha } from "@/lib/dominio/equipe";

export const dynamic = "force-dynamic";

export default async function ChatDoEscritorio({
  params,
  searchParams,
}: {
  params: Promise<{ escritorio: string; id: string }>;
  searchParams: Promise<{ aba?: string; ok?: string; erro?: string }>;
}) {
  const { escritorio: escritorioId, id } = await params;
  const { aba, ok, erro } = await searchParams;
  const contexto = await contextoLogado();
  const escritorio = exigeEscritorio(contexto, escritorioId);
  const segmentoEquipe = aba === "equipe";

  const [conversasRes, mensagens, bloqueio, equipeRes] = await Promise.all([
    contexto.supabase.rpc("fetch_conversations_for_current_user", {
      scope_value: segmentoEquipe ? "firmTeam" : "firmClient",
      law_firm_id_value: escritorio.id,
    }),
    carregaMensagens(contexto.supabase, id, contexto.usuario.id),
    carregaBloqueio(contexto.supabase, id),
    contexto.supabase
      .from("law_firm_members")
      .select(
        "profile_id, lawyer_id, roles, member_role, role, status, profiles(full_name, initials, avatar_url)",
      )
      .eq("law_firm_id", escritorio.id)
      .eq("status", "active"),
  ]);

  const advogadosDaEquipe = ((equipeRes.data as unknown[]) ?? [])
    .map((linha) => membroDaLinha(linha as Record<string, unknown>))
    .filter((membro) => membro.lawyerId !== null)
    .map((membro) => ({ id: membro.lawyerId as string, nome: membro.nome }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

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
      titulo="Mensagens"
      subtitulo={`Conversas de ${escritorio.nome}.`}
      conversas={conversas}
      baseHref={`/escritorio/${escritorioId}/conversas`}
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
            href={`/escritorio/${escritorioId}/mensagens`}
            className={segmentoEquipe ? "" : "ativa"}
          >
            Clientes
          </Link>
          <Link
            href={`/escritorio/${escritorioId}/mensagens?aba=equipe`}
            className={segmentoEquipe ? "ativa" : ""}
          >
            Equipe
          </Link>
        </nav>
      }
    >
      <div className="cabecalho-do-chat">
        <Link href={`/escritorio/${escritorioId}/mensagens${sufixo}`}>
          ← Mensagens
        </Link>
        <span className="nome">{conversa?.titulo ?? "Conversa"}</span>
        {conversa != null && conversa.especialidade !== "" && (
          <span className="area">{conversa.especialidade}</span>
        )}
        {/* As acoes de caso vivem no CABECALHO, como no app (la sao
            icones da barra superior). Empilhadas acima das mensagens elas
            empurravam a conversa para baixo e competiam com ela. */}
        <span className="acoes-do-chat">
          {!segmentoEquipe && (
            <>
              <ProporCaso
                conversaId={id}
                voltar={`/escritorio/${escritorioId}/conversas/${id}${sufixo}`}
              />
              <IndicarAdvogado
                conversaId={id}
                escritorioId={escritorio.id}
                voltar={`/escritorio/${escritorioId}/conversas/${id}${sufixo}`}
                advogados={advogadosDaEquipe}
              />
            </>
          )}
          <ModeracaoDaConversa
            conversaId={id}
            voltar={`/escritorio/${escritorioId}/conversas/${id}${sufixo}`}
            bloqueada={bloqueio.bloqueada}
            bloqueadaPorMim={bloqueio.porMim}
          />
        </span>
      </div>
      {erro !== undefined && <p className="erro">{erro}</p>}
      {ok === "indicado" && (
        <p className="aviso-bom">Advogado sugerido ao cliente.</p>
      )}
      {ok === "proposta" && (
        <p className="aviso-bom">
          Solicitação enviada. O cliente decide em Meus casos; quando
          aceitar, o caso entra na carteira do escritório.
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
