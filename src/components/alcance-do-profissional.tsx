import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  diaDeAlcanceDaLinha,
  resumoDeAlcance,
} from "@/lib/dominio/alcance";

/**
 * O alcance dos últimos 7 dias, o funil que o app mostra no painel de
 * alcance: viram na busca, abriram o perfil, iniciaram conversa; e a
 * comparação com os 7 dias anteriores. MESMA RPC (fetch_professional_reach,
 * days = janela * 2, como o app pede para ter a comparação).
 */
export async function AlcanceDoProfissional({
  supabase,
  tipo,
  id,
  href,
  estreito = false,
}: {
  supabase: SupabaseClient;
  tipo: "lawyer" | "law_firm";
  id: string;
  /** O painel completo, com gráfico e funil. */
  href: string;
  /**
   * Empilhado, para caber numa coluna lateral. Sem isto os três números
   * ficavam espremidos em três colunas de 80px e o rótulo quebrava em
   * quatro linhas.
   */
  estreito?: boolean;
}) {
  const { data, error } = await supabase.rpc("fetch_professional_reach", {
    target_type_value: tipo,
    target_id_value: id,
    days_value: 14,
  });
  if (error) return null;

  const resumo = resumoDeAlcance(
    (((data as unknown[]) ?? []) as Record<string, unknown>[]).map(
      diaDeAlcanceDaLinha,
    ),
    7,
  );

  const variacao =
    resumo.alcanceAnterior === 0
      ? null
      : Math.round(
          ((resumo.alcance - resumo.alcanceAnterior) /
            resumo.alcanceAnterior) *
            100,
        );

  const selo = (valor: number | null, titulo?: string) =>
    valor === null ? null : (
      <span className="selo" style={{ marginLeft: 6 }} title={titulo}>
        {valor >= 0 && titulo !== undefined ? `+${valor}%` : `${valor}%`}
      </span>
    );

  // NA LATERAL, um cartão só com três linhas. Como três cartões empilhados,
  // o funil gastava 300px de altura para dizer três zeros, que é o estado
  // normal de escritório novo.
  if (estreito) {
    const linhas = [
      {
        rotulo: "viram você na busca",
        valor: resumo.alcance,
        selo: selo(variacao, "Comparação com os 7 dias anteriores"),
      },
      {
        rotulo: "abriram seu perfil",
        valor: resumo.visitas,
        selo: selo(resumo.taxaDeVisita),
      },
      {
        rotulo: "iniciaram conversa",
        valor: resumo.conversas,
        selo: selo(resumo.taxaDeConversa),
      },
    ];
    return (
      <div className="cartao">
        <div className="linha-topo">
          <strong>Alcance em 7 dias</strong>
          <Link className="discreto" href={href}>
            Gráficos
          </Link>
        </div>
        <div className="funil-estreito">
          {linhas.map((linha) => (
            <div key={linha.rotulo}>
              <span className="numero">{linha.valor}</span>
              <span className="rotulo">
                {linha.rotulo}
                {linha.selo}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="linha-topo" style={{ marginTop: 18 }}>
        <h2 className="secao" style={{ margin: 0 }}>
          Alcance dos últimos 7 dias
        </h2>
        <Link className="link-do-nome" href={href}>
          Ver gráficos
        </Link>
      </div>
      <div
        className="metricas"
        style={{ gridTemplateColumns: "repeat(3, 1fr)", maxWidth: 720 }}
      >
        <div className="metrica">
          <div className="numero">{resumo.alcance}</div>
          <div className="rotulo">
            viram você na busca
            {variacao !== null && (
              <span
                className="selo"
                style={{ marginLeft: 6 }}
                title="Comparação com os 7 dias anteriores"
              >
                {variacao >= 0 ? `+${variacao}%` : `${variacao}%`}
              </span>
            )}
          </div>
        </div>
        <div className="metrica">
          <div className="numero">{resumo.visitas}</div>
          <div className="rotulo">
            abriram seu perfil
            {resumo.taxaDeVisita !== null && (
              <span className="selo" style={{ marginLeft: 6 }}>
                {resumo.taxaDeVisita}%
              </span>
            )}
          </div>
        </div>
        <div className="metrica">
          <div className="numero">{resumo.conversas}</div>
          <div className="rotulo">
            iniciaram conversa
            {resumo.taxaDeConversa !== null && (
              <span className="selo" style={{ marginLeft: 6 }}>
                {resumo.taxaDeConversa}%
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
