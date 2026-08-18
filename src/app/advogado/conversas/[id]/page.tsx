import Link from "next/link";

import { Chat } from "@/components/chat";
import { ModeracaoDaConversa } from "@/components/moderacao-da-conversa";
import { PainelDeMensagens } from "@/components/paineis";
import { ProporCaso } from "@/components/propor-caso";
import { Icone } from "@/components/icone";
import {
  carregaBloqueio,
  carregaContextoDoAtendimento,
  carregaConversa,
  carregaMensagens,
} from "@/lib/chat-servidor";
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

  const [conversasRes, pagina, bloqueio, atendimento] = await Promise.all([
    contexto.supabase.rpc("fetch_conversations_for_current_user", {
      scope_value: "lawyer",
      law_firm_id_value: null,
    }),
    carregaMensagens(contexto.supabase, id, contexto.usuario.id),
    carregaBloqueio(contexto.supabase, id),
    carregaContextoDoAtendimento(contexto.supabase, id),
  ]);

  // Na conversa PESSOAL o advogado é o responsável por definição, e é quem
  // create_case_request aceita (lawyer_id da conversa = auth.uid()).
  const souOResponsavel =
    atendimento.advogadoDaConversaId === contexto.usuario.id;

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
        <Link
          href="/advogado"
          className="voltar"
          aria-label="Voltar para Conversas"
          title="Voltar para Conversas"
        >
          <Icone nome="seta-direita" tamanho={16} className="seta-de-voltar" />
        </Link>
        <span className="avatar pequeno identidade-do-chat" aria-hidden>
          {conversa?.iniciais ?? "?"}
        </span>
        <span className="quem">
          <span className="nome" title={conversa?.titulo ?? ""}>
            {conversa?.titulo ?? "Conversa"}
          </span>
          {conversa != null && conversa.especialidade !== "" && (
            <span className="area">{conversa.especialidade}</span>
          )}
        </span>
        <span className="atendimento">
          {/* Na área pessoal quem atende sou eu; dizer isso seria ruído. O
              que vale é o caso ligado, quando há. */}
          {atendimento.casoId !== null && (
            <Link
              className="link-do-caso"
              href={`/advogado/casos/${atendimento.casoId}`}
              title={atendimento.casoTitulo ?? "Abrir o caso"}
            >
              <Icone nome="casos" tamanho={14} />
              Ver caso
            </Link>
          )}
        </span>
        <span className="acoes-do-chat">
          {souOResponsavel && (
            <ProporCaso conversaId={id} voltar={`/advogado/conversas/${id}`} />
          )}
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
        mensagensIniciais={pagina.mensagens}
        temAnterioresInicial={pagina.temAnteriores}
        bloqueada={bloqueio.bloqueada}
        nomeDoCliente={conversa?.titulo ?? "Cliente"}
      />
    </PainelDeMensagens>
  );
}
