import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  caminhosDoGrafico,
  dataCurta,
  diaDeAlcanceDaLinha,
  resumoDeAlcance,
} from "@/lib/dominio/alcance";

/**
 * O painel "Seu alcance", espelho da professional_reach_screen do app:
 * o número grande com o chip de variação, o gráfico de área do alcance
 * diário e o funil "do primeiro olhar à conversa".
 *
 * O gráfico é SVG desenhado à mão, como o app desenha com CustomPainter e
 * pelo MESMO motivo: são duas curvas e um degradê, e uma biblioteca de
 * gráfico traria mil opções que teriam de ser desligadas uma a uma para
 * caber na identidade da casa.
 */
export async function PainelDeAlcance({
  supabase,
  tipo,
  id,
  janela,
  base,
}: {
  supabase: SupabaseClient;
  tipo: "lawyer" | "law_firm";
  id: string;
  /** 7 ou 30, como os chips do app. */
  janela: number;
  /** A rota desta página, para os chips trocarem a janela. */
  base: string;
}) {
  const { data, error } = await supabase.rpc("fetch_professional_reach", {
    target_type_value: tipo,
    target_id_value: id,
    days_value: janela * 2,
  });

  if (error) {
    // PGRST202 = a função ainda não existe neste ambiente: a medição acabou
    // de ser ativada. As palavras são as do app.
    const preparando = error.code === "PGRST202";
    return (
      <p className="vazio">
        {preparando
          ? "Seus números estão sendo preparados. A medição de alcance acabou de ser ativada."
          : "Não foi possível carregar seus números."}
      </p>
    );
  }

  const resumo = resumoDeAlcance(
    (((data as unknown[]) ?? []) as Record<string, unknown>[]).map(
      diaDeAlcanceDaLinha,
    ),
    janela,
  );

  const LARGURA = 600;
  const ALTURA = 140;
  const caminhos = caminhosDoGrafico(resumo.serie, LARGURA, ALTURA);
  const variacao = resumo.variacao;
  const subiu = variacao !== null && variacao >= 0;
  const porcento =
    variacao === null ? null : Math.round(Math.abs(variacao) * 100);

  const degraus = [
    { rotulo: "viram você na busca", valor: resumo.alcance, taxa: null, cor: 1 },
    {
      rotulo: "abriram seu perfil",
      valor: resumo.visitas,
      taxa: resumo.taxaDeVisita,
      cor: 2,
    },
    {
      rotulo: "iniciaram conversa",
      valor: resumo.conversas,
      taxa: resumo.taxaDeConversa,
      cor: 3,
    },
  ];
  const topo = resumo.alcance;
  const vazio =
    resumo.alcance === 0 && resumo.visitas === 0 && resumo.conversas === 0;

  return (
    <>
      <nav className="troca-de-fluxo" aria-label="Janela do alcance">
        {[7, 30].map((dias) => (
          <Link
            key={dias}
            href={dias === 30 ? base : `${base}?dias=${dias}`}
            className={janela === dias ? "ativa" : ""}
          >
            {dias} dias
          </Link>
        ))}
      </nav>

      <div className="cartao" style={{ marginTop: 12 }}>
        {/* "VISUALIZAÇÕES", e não "pessoas": a contagem é por pessoa POR
            DIA, então quem abre o perfil em três dias entra três vezes. O
            título carrega a distinção sozinho, como no app. */}
        <span className="rotulo-do-painel">Visualizações na busca</span>
        <div className="numero-do-alcance">
          <strong>{resumo.alcance}</strong>
          {porcento !== null && (
            <span className={subiu ? "chip-de-variacao subiu" : "chip-de-variacao desceu"}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                {subiu ? (
                  <path d="M3 17l6-6 4 4 8-8M15 7h6v6" />
                ) : (
                  <path d="M3 7l6 6 4-4 8 8M15 17h6v-6" />
                )}
              </svg>
              {porcento}%
            </span>
          )}
        </div>
        <p className="detalhe" style={{ margin: "2px 0 14px" }}>
          {variacao === null
            ? `nos últimos ${janela} dias`
            : `nos últimos ${janela} dias, contra os ${janela} anteriores`}
        </p>

        {caminhos !== null && resumo.serie.length > 1 && (
          <>
            <svg
              className="grafico-de-alcance"
              viewBox={`0 0 ${LARGURA} ${ALTURA}`}
              preserveAspectRatio="none"
              role="img"
              aria-label={`Gráfico de alcance diário, de ${dataCurta(resumo.serie[0].dia)} a ${dataCurta(resumo.serie[resumo.serie.length - 1].dia)}. Maior alcance num dia: ${Math.max(...resumo.serie.map((dia) => dia.alcance))} visualizações.`}
            >
              <defs>
                <linearGradient id="veu-do-alcance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="currentColor" stopOpacity="0.02" />
                </linearGradient>
              </defs>
              {[1, 2, 3].map((i) => (
                <line
                  key={i}
                  className="grade"
                  x1="0"
                  x2={LARGURA}
                  y1={(ALTURA * i) / 4}
                  y2={(ALTURA * i) / 4}
                />
              ))}
              <path className="veu" d={caminhos.area} fill="url(#veu-do-alcance)" />
              <path className="curva" d={caminhos.linha} fill="none" />
            </svg>
            <div className="pontas-do-grafico" aria-hidden>
              <span>{dataCurta(resumo.serie[0].dia)}</span>
              <span>{dataCurta(resumo.serie[resumo.serie.length - 1].dia)}</span>
            </div>
          </>
        )}

        {resumo.patrocinado > 0 && (
          <p className="detalhe nota-de-patrocinio">
            <span className="ponto-dourado" aria-hidden />
            {resumo.patrocinado} das visualizações vieram de vaga patrocinada
          </p>
        )}
      </div>

      <div className="cartao" style={{ marginTop: 14 }}>
        <span className="rotulo-do-painel">Do primeiro olhar à conversa</span>
        {vazio ? (
          <p className="detalhe" style={{ marginTop: 8 }}>
            Ainda sem movimento no período. Assim que alguém buscar por suas
            áreas, os números aparecem aqui.
          </p>
        ) : (
          <div className="funil-do-alcance">
            {degraus.map((degrau) => (
              <div
                key={degrau.rotulo}
                className="degrau"
                role="img"
                aria-label={
                  degrau.taxa === null
                    ? `${degrau.valor} ${degrau.rotulo}`
                    : `${degrau.valor} ${degrau.rotulo}, ${degrau.taxa} por cento do degrau anterior`
                }
              >
                <div className="cabeca">
                  <span>{degrau.rotulo}</span>
                  <strong>
                    {degrau.valor}
                    {degrau.taxa !== null && (
                      <span className="taxa"> · {degrau.taxa}%</span>
                    )}
                  </strong>
                </div>
                <div className="trilho" aria-hidden>
                  <div
                    className={`barra cor-${degrau.cor}`}
                    style={{
                      width:
                        topo === 0
                          ? "0%"
                          : `${Math.max(2, Math.round((degrau.valor / topo) * 100))}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
