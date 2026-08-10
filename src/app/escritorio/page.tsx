import Link from "next/link";

import { Casca } from "@/components/casca";
import { contextoLogado, exigeEscritorio } from "@/lib/contexto";
import { casoDoEscritorioDaLinha } from "@/lib/dominio/casos";

export const dynamic = "force-dynamic";

/**
 * A visão geral do escritório, o painel que o app mostra na home do fluxo:
 * os números da operação (fetch_law_firm_operation_metrics, a mesma RPC) e
 * as duas perguntas de carteira que custam dinheiro: o que está sem
 * responsável e o que está aguardando resposta.
 */
export default async function PaginaDoEscritorio() {
  const contexto = await contextoLogado();
  const escritorio = exigeEscritorio(contexto);

  const [metricasRes, casosRes] = await Promise.all([
    contexto.supabase.rpc("fetch_law_firm_operation_metrics", {
      law_firm_id_value: escritorio.id,
    }),
    contexto.supabase.rpc("fetch_law_firm_cases", {
      law_firm_id_value: escritorio.id,
    }),
  ]);

  const metricas =
    ((metricasRes.data as unknown[]) ?? [])[0] as
      | Record<string, unknown>
      | undefined;
  const casos = ((casosRes.data as unknown[]) ?? []).map((linha) =>
    casoDoEscritorioDaLinha(linha as Record<string, unknown>),
  );

  const semResponsavel = casos.filter(
    (caso) => !caso.encerrado && caso.advogadoId === null,
  ).length;
  const aguardando = casos.filter((caso) => caso.urgente).length;

  const numeros = [
    {
      rotulo: "Conversas de clientes",
      valor: Number(metricas?.client_messages ?? 0),
      href: "/escritorio/mensagens",
    },
    {
      rotulo: "Conversas internas",
      valor: Number(metricas?.team_messages ?? 0),
      href: "/escritorio/mensagens?aba=equipe",
    },
    {
      rotulo: "Casos ativos",
      valor: Number(metricas?.active_cases ?? 0),
      href: "/escritorio/casos",
    },
    {
      rotulo: "Pessoas na equipe",
      valor: Number(metricas?.team_members ?? 0),
      href: "/escritorio/equipe",
    },
  ];

  return (
    <Casca fluxo="escritorio" fluxos={contexto.fluxos} caminhoAtivo="/escritorio">
      <h1>{escritorio.nome}</h1>
      <p className="subtitulo">A operação do escritório num olhar.</p>

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

      {(semResponsavel > 0 || aguardando > 0) && (
        <>
          <h2 className="secao">Precisa de atenção</h2>
          <div style={{ display: "grid", gap: 12 }}>
            {semResponsavel > 0 && (
              <Link href="/escritorio/casos" className="cartao-de-lista">
                <span className="conteudo">
                  <span className="titulo">
                    {semResponsavel === 1
                      ? "1 caso sem advogado responsável"
                      : `${semResponsavel} casos sem advogado responsável`}
                  </span>
                  <p className="linha-2">
                    Caso sem responsável é cliente esperando ninguém.
                  </p>
                </span>
                <span className="pilula-nao-lidas">{semResponsavel}</span>
              </Link>
            )}
            {aguardando > 0 && (
              <Link href="/escritorio/casos" className="cartao-de-lista">
                <span className="conteudo">
                  <span className="titulo">
                    {aguardando === 1
                      ? "1 caso aguardando resposta"
                      : `${aguardando} casos aguardando resposta`}
                  </span>
                  <p className="linha-2">
                    O cliente mandou mensagem e ainda não foi respondido.
                  </p>
                </span>
                <span className="pilula-nao-lidas">{aguardando}</span>
              </Link>
            )}
          </div>
        </>
      )}
    </Casca>
  );
}
