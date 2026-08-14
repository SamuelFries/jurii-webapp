import Link from "next/link";

import { AlcanceDoProfissional } from "@/components/alcance-do-profissional";
import { contextoLogado, exigeEscritorio } from "@/lib/contexto";
import { casoDoEscritorioDaLinha } from "@/lib/dominio/casos";
import { conversaDaLinha, rotuloDeHorario } from "@/lib/dominio/conversas";
import {
  passosDoEscritorio,
  progressoDoEscritorio,
  type EstadoDoEscritorio,
} from "@/lib/dominio/visao-do-escritorio";
import {
  assinaturaDaLinha,
  diasRestantesDeTeste,
  rotuloDeStatus,
} from "@/lib/licenca";

export const dynamic = "force-dynamic";

/** Quantos itens de cada fila cabem antes de a tela virar lista. */
const NA_VISAO = 4;

/**
 * A visão geral do escritório.
 *
 * O QUE ELA MOSTRA, e por quê nesta ordem: primeiro o que precisa de uma
 * PESSOA hoje (caso sem responsável, cliente esperando resposta), com nome e
 * link direto, porque contagem sem item obriga a abrir outra tela para
 * descobrir de quem se trata. Depois o que falta para o escritório
 * funcionar, que é o único conteúdo útil enquanto a operação está zerada.
 * Alcance, equipe e assinatura ficam na coluna lateral: são consulta, não
 * ação.
 *
 * A versão anterior mostrava quatro números e duas seções condicionais.
 * Escritório recém-aprovado, que é justamente quem mais precisa de direção,
 * via quatro zeros e meia tela vazia.
 */
export default async function PaginaDoEscritorio({
  params,
}: {
  params: Promise<{ escritorio: string }>;
}) {
  const { escritorio: escritorioId } = await params;
  const contexto = await contextoLogado();
  const escritorio = exigeEscritorio(contexto, escritorioId);

  // Tudo de uma vez: a tela é a primeira depois do login, e encadear
  // consultas aqui aparece como espera na cara da pessoa.
  const [metricasRes, casosRes, conversasRes, firmaRes, horariosRes, assinaturaRes] =
    await Promise.all([
      contexto.supabase.rpc("fetch_law_firm_operation_metrics", {
        law_firm_id_value: escritorio.id,
      }),
      contexto.supabase.rpc("fetch_law_firm_cases", {
        law_firm_id_value: escritorio.id,
      }),
      contexto.supabase.rpc("fetch_conversations_for_current_user", {
        scope_value: "firmClient",
        law_firm_id_value: escritorio.id,
      }),
      contexto.supabase
        .from("law_firms")
        .select("description, practice_areas, cep, phone, email")
        .eq("id", escritorio.id)
        .maybeSingle(),
      contexto.supabase
        .from("law_firm_business_hours")
        .select("weekday")
        .eq("law_firm_id", escritorio.id),
      // O filtro por escritório é obrigatório: quem gerencia mais de uma
      // banca recebe da policy uma linha por escritório, e o maybeSingle
      // estouraria em vez de trazer a assinatura desta tela.
      contexto.supabase
        .from("law_firm_license_subscriptions")
        .select("*, law_firm_license_plans(*)")
        .eq("law_firm_id", escritorio.id)
        .neq("status", "canceled")
        .maybeSingle(),
    ]);

  const agora = new Date();
  const metricas =
    ((metricasRes.data as unknown[]) ?? [])[0] as
      | Record<string, unknown>
      | undefined;
  const casos = ((casosRes.data as unknown[]) ?? []).map((linha) =>
    casoDoEscritorioDaLinha(linha as Record<string, unknown>),
  );
  const conversas = ((conversasRes.data as unknown[]) ?? []).map((linha) =>
    conversaDaLinha(linha as Record<string, unknown>),
  );
  const firma = (firmaRes.data ?? {}) as Record<string, unknown>;
  const assinatura = assinaturaRes.data
    ? assinaturaDaLinha(assinaturaRes.data)
    : null;

  const semResponsavel = casos.filter(
    (caso) => !caso.encerrado && caso.advogadoId === null,
  );
  const aguardandoResposta = casos.filter(
    (caso) => caso.urgente && caso.advogadoId !== null,
  );
  const conversasParadas = conversas
    .filter((conversa) => conversa.naoLidas > 0)
    .sort(
      (a, b) =>
        (a.ultimaMensagemEm?.getTime() ?? 0) -
        (b.ultimaMensagemEm?.getTime() ?? 0),
    );

  const pessoasNaEquipe = Number(metricas?.team_members ?? 0);
  const estado: EstadoDoEscritorio = {
    apresentacao: String(firma.description ?? ""),
    areas: Array.isArray(firma.practice_areas)
      ? (firma.practice_areas as unknown[]).map(String)
      : [],
    cep: String(firma.cep ?? ""),
    telefone: String(firma.phone ?? ""),
    email: String(firma.email ?? ""),
    diasComHorario: ((horariosRes.data as unknown[]) ?? []).length,
    pessoasNaEquipe,
  };
  const passos = passosDoEscritorio(estado, escritorio.id);
  const progresso = progressoDoEscritorio(estado);

  const pendencias =
    semResponsavel.length + aguardandoResposta.length + conversasParadas.length;

  const numeros = [
    {
      rotulo: "Conversas de clientes",
      valor: Number(metricas?.client_messages ?? 0),
      href: `/escritorio/${escritorioId}/mensagens`,
    },
    {
      rotulo: "Conversas internas",
      valor: Number(metricas?.team_messages ?? 0),
      href: `/escritorio/${escritorioId}/mensagens?aba=equipe`,
    },
    {
      rotulo: "Casos ativos",
      valor: Number(metricas?.active_cases ?? 0),
      href: `/escritorio/${escritorioId}/casos`,
    },
    {
      rotulo: "Pessoas na equipe",
      valor: pessoasNaEquipe,
      href: `/escritorio/${escritorioId}/equipe`,
    },
  ];

  const diasDeTeste =
    assinatura === null ? 0 : diasRestantesDeTeste(assinatura, agora);

  return (
    <div className="pagina-de-trabalho">
      <h1 style={{ marginTop: 0 }}>{escritorio.nome}</h1>
      <p className="subtitulo">
        {pendencias === 0
          ? "Nada esperando por uma pessoa agora."
          : pendencias === 1
            ? "1 coisa esperando por uma pessoa."
            : `${pendencias} coisas esperando por uma pessoa.`}
      </p>

      <div className="metricas">
        {numeros.map((numero) => (
          <Link
            key={numero.rotulo}
            href={numero.href}
            className="metrica"
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <div className="numero">{numero.valor}</div>
            <div className="rotulo">{numero.rotulo}</div>
          </Link>
        ))}
      </div>

      <div className="visao-em-duas-colunas">
        <section>
          {/* QUEM LIDERA depende do estado. Com pendência, ela vem primeiro,
              sempre. Sem pendência e com cadastro incompleto, o quadro
              "nada esperando" só repetiria o subtítulo e empurraria para
              baixo a única coisa acionável da tela. */}
          {pendencias > 0 && (
            <>
              <h2 className="secao" style={{ marginTop: 0 }}>
                Precisa de você
              </h2>
              <div className="lista-empilhada">
              {/* CASO SEM RESPONSÁVEL vem primeiro: é o único item da lista em
                  que ninguém sequer sabe que precisa agir. */}
              {semResponsavel.slice(0, NA_VISAO).map((caso) => (
                <Link
                  key={caso.id}
                  href={`/escritorio/${escritorioId}/casos/${caso.id}`}
                  className="cartao-de-lista"
                >
                  <span className="conteudo">
                    <span className="titulo">{caso.titulo}</span>
                    <p className="linha-2">
                      {caso.cliente} · {caso.area}
                    </p>
                  </span>
                  <span className="selo">sem responsável</span>
                </Link>
              ))}

              {conversasParadas.slice(0, NA_VISAO).map((conversa) => (
                <Link
                  key={conversa.id}
                  href={`/escritorio/${escritorioId}/conversas/${conversa.id}`}
                  className="cartao-de-lista"
                >
                  <span className="conteudo">
                    <span className="titulo">{conversa.titulo}</span>
                    <p className="linha-2">{conversa.ultimaMensagem}</p>
                  </span>
                  <span className="sinais-do-cartao">
                    <span className="pilula-nao-lidas">
                      {conversa.naoLidas}
                    </span>
                    {conversa.ultimaMensagemEm !== null && (
                      <span className="detalhe">
                        {rotuloDeHorario(conversa.ultimaMensagemEm, agora)}
                      </span>
                    )}
                  </span>
                </Link>
              ))}

              {aguardandoResposta.slice(0, NA_VISAO).map((caso) => (
                <Link
                  key={caso.id}
                  href={`/escritorio/${escritorioId}/casos/${caso.id}`}
                  className="cartao-de-lista"
                >
                  <span className="conteudo">
                    <span className="titulo">{caso.titulo}</span>
                    <p className="linha-2">
                      {caso.cliente} · com {caso.advogado}
                    </p>
                  </span>
                  <span className="selo">aguardando resposta</span>
                </Link>
              ))}

              {pendencias > NA_VISAO && (
                <Link
                  className="botao secundario compacto"
                  href={`/escritorio/${escritorioId}/casos`}
                >
                  Ver a carteira inteira
                </Link>
              )}
              </div>
            </>
          )}

          {pendencias === 0 && passos.length === 0 && (
            <>
              <h2 className="secao" style={{ marginTop: 0 }}>
                Precisa de você
              </h2>
              <p className="vazio">
                Nenhum caso sem responsável e nenhum cliente esperando
                resposta.
              </p>
            </>
          )}

          {passos.length > 0 && (
            <>
              <h2 className="secao" style={{ marginTop: pendencias > 0 ? undefined : 0 }}>
                Para o cliente achar o escritório
                <span className="detalhe" style={{ fontWeight: 600 }}>
                  {" "}
                  {progresso.feitos} de {progresso.total}
                </span>
              </h2>
              <div className="lista-empilhada">
                {passos.map((passo) => (
                  <Link
                    key={passo.chave}
                    href={passo.href}
                    className="cartao-de-lista explicativo"
                  >
                    <span className="conteudo">
                      <span className="titulo">{passo.titulo}</span>
                      <p className="linha-2">{passo.porque}</p>
                    </span>
                    <span className="seta" aria-hidden>
                      ›
                    </span>
                  </Link>
                ))}
              </div>
            </>
          )}
        </section>

        <aside className="coluna-lateral">
          <AlcanceDoProfissional
            supabase={contexto.supabase}
            tipo="law_firm"
            id={escritorio.id}
            href={`/escritorio/${escritorioId}/alcance`}
            estreito
          />

          <div className="cartao">
            <div className="linha-topo">
              <strong>Assinatura</strong>
              <Link
                className="discreto"
                href={`/escritorio/${escritorioId}/assinatura`}
              >
                Ver
              </Link>
            </div>
            {assinatura === null ? (
              <p className="detalhe" style={{ marginTop: 6 }}>
                Sem plano escolhido.
              </p>
            ) : (
              <>
                <p className="detalhe" style={{ marginTop: 6 }}>
                  {rotuloDeStatus(assinatura, agora)}
                </p>
                {/* A contagem do teste aparece SÓ na reta final: avisar no
                    primeiro dia é ruído, e no último é tarde. */}
                {assinatura.status === "trialing" && diasDeTeste <= 7 && (
                  <p className="erro" style={{ marginTop: 8 }}>
                    {diasDeTeste <= 0
                      ? "O teste grátis terminou."
                      : diasDeTeste === 1
                        ? "Último dia de teste grátis."
                        : `Faltam ${diasDeTeste} dias de teste grátis.`}
                  </p>
                )}
              </>
            )}
          </div>

          <div className="cartao">
            <div className="linha-topo">
              <strong>Equipe</strong>
              <Link
                className="discreto"
                href={`/escritorio/${escritorioId}/equipe`}
              >
                Ver
              </Link>
            </div>
            <p className="detalhe" style={{ marginTop: 6 }}>
              {pessoasNaEquipe <= 1
                ? "Só você por enquanto."
                : `${pessoasNaEquipe} pessoas, contando você.`}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
