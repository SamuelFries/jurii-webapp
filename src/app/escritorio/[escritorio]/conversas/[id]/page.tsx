import Link from "next/link";

import { Chat } from "@/components/chat";
import { ModeracaoDaConversa } from "@/components/moderacao-da-conversa";
import { PainelDeMensagens } from "@/components/paineis";
import { IndicarAdvogado } from "@/components/indicar-advogado";
import { ProporCaso } from "@/components/propor-caso";
import { Icone } from "@/components/icone";
import {
  carregaBloqueio,
  carregaContextoDoAtendimento,
  carregaConversa,
  carregaMensagens,
} from "@/lib/chat-servidor";
import { primeiroNome } from "@/lib/dominio/chat-aberto";
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

  const [conversasRes, pagina, bloqueio, equipeRes, atendimento] = await Promise.all([
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
    carregaContextoDoAtendimento(contexto.supabase, id, escritorio.id),
  ]);

  const membros = ((equipeRes.data as unknown[]) ?? []).map((linha) =>
    membroDaLinha(linha as Record<string, unknown>),
  );
  const advogadosDaEquipe = membros
    .filter((membro) => membro.lawyerId !== null)
    .map((membro) => ({ id: membro.lawyerId as string, nome: membro.nome }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  // Para o chat dar nome e PAPEL a cada mensagem da equipe.
  const equipeParaAutoria = membros.map((membro) => ({
    profileId: membro.profileId,
    nome: membro.nome,
    papeis: membro.papeis,
  }));

  // QUEM PODE O QUÊ, pelas regras que o banco já tem:
  //  - propor caso: só o advogado responsável pela conversa
  //    (create_case_request: "Only the responsible lawyer"). Sem responsável
  //    definido, ninguém propõe por aqui até haver um.
  //  - indicar advogado: quem pode recomendar (dono/admin/advogado/
  //    secretária), que é o público de sempre desse botão.
  // A tela oferece só o que o servidor aceita: botão que leva a "não" é
  // link morto.
  // A REGRA EXATA do banco: create_case_request compara o lawyer_id da
  // CONVERSA (não o do caso) com auth.uid(). Numa conversa cliente<->
  // escritório o lawyer_id é nulo, e a proposta nasce só depois de o
  // escritório indicar um advogado (a conversa nova, pessoal, é onde se
  // propõe). Então aqui o botão aparece só quando a conversa tem lawyer_id
  // e ele sou eu, que é literalmente quando o servidor diz sim.
  const souOResponsavel =
    atendimento.advogadoDaConversaId !== null &&
    atendimento.advogadoDaConversaId === contexto.usuario.id;
  const meusPapeis = escritorio.papeis;
  const podeIndicar = meusPapeis.some((p) =>
    ["owner", "admin", "lawyer", "secretary"].includes(p),
  );

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
      {/* O CABEÇALHO responde às cinco perguntas de quem abre a conversa:
          com quem falo, sobre o quê, quem atende, há caso ligado, e o que
          posso fazer. Uma linha a 1440; duas por DESENHO a 1024 (identidade
          em cima, atendimento e ações embaixo), nunca por acidente. */}
      <div className="cabecalho-do-chat">
        <Link
          href={`/escritorio/${escritorioId}/mensagens${sufixo}`}
          className="voltar"
          aria-label="Voltar para Mensagens"
          title="Voltar para Mensagens"
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
          {/* "Atende: X" SÓ quando existe responsável. Sem responsável, diz
              isso no tom de aviso, e a atribuição continua onde sempre
              esteve (no caso), com as permissões do banco. */}
          {atendimento.responsavelNome !== null ? (
            <span className="responsavel" title={`Responsável: ${atendimento.responsavelNome}`}>
              <Icone nome="perfil" tamanho={14} />
              Atende: {primeiroNome(atendimento.responsavelNome)}
            </span>
          ) : atendimento.casoId !== null ? (
            <span className="responsavel sem-responsavel">
              <Icone nome="alerta" tamanho={14} />
              Sem responsável
            </span>
          ) : null}
          {atendimento.casoId !== null && (
            <Link
              className="link-do-caso"
              href={`/escritorio/${escritorioId}/casos/${atendimento.casoId}`}
              title={atendimento.casoTitulo ?? "Abrir o caso"}
            >
              <Icone nome="casos" tamanho={14} />
              Ver caso
            </Link>
          )}
        </span>

        <span className="acoes-do-chat">
          {!segmentoEquipe && souOResponsavel && (
            <ProporCaso
              conversaId={id}
              voltar={`/escritorio/${escritorioId}/conversas/${id}${sufixo}`}
            />
          )}
          {!segmentoEquipe && podeIndicar && (
            <IndicarAdvogado
              conversaId={id}
              escritorioId={escritorio.id}
              voltar={`/escritorio/${escritorioId}/conversas/${id}${sufixo}`}
              advogados={advogadosDaEquipe}
            />
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
        mensagensIniciais={pagina.mensagens}
        temAnterioresInicial={pagina.temAnteriores}
        bloqueada={bloqueio.bloqueada}
        nomeDoCliente={conversa?.titulo ?? "Cliente"}
        equipe={equipeParaAutoria}
      />
    </PainelDeMensagens>
  );
}
