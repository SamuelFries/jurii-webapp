"use client";

import Link from "next/link";
import { useState } from "react";

import {
  filtraCasosDoEscritorio,
  type CasoDoEscritorioParaTela,
} from "@/lib/busca/filtros";

import { CampoDeBusca, FileiraDeChips, NadaEncontrado } from "./controles";

export function CasosDoEscritorioComBusca({
  casos,
  baseHref,
  ativoId,
}: {
  casos: CasoDoEscritorioParaTela[];
  /**
   * A lista de casos DESTE escritório, ex.: "/escritorio/{id}/casos". Vem de
   * quem chama porque o componente é de cliente e não tem como saber qual
   * banca está aberta; com o caminho escrito aqui dentro, todo clique caía
   * numa rota sem escritório.
   */
  baseHref: string;
  ativoId?: string;
}) {
  const [termo, setTermo] = useState("");
  const [soEmAndamento, setSoEmAndamento] = useState(false);
  const [soSemResponsavel, setSoSemResponsavel] = useState(false);
  const [soUrgentes, setSoUrgentes] = useState(false);

  if (casos.length === 0) {
    return (
      <p className="vazio">
        Quando um cliente aceitar um caso do escritório, ele aparece aqui.
      </p>
    );
  }

  const visiveis = filtraCasosDoEscritorio(
    casos,
    termo,
    soEmAndamento,
    soSemResponsavel,
    soUrgentes,
  );
  const plural =
    casos.length === 1 ? "caso do escritório continua" : "casos do escritório continuam";

  return (
    <>
      <CampoDeBusca
        valor={termo}
        aoMudar={setTermo}
        placeholder="Buscar por cliente, advogado ou processo"
        rotulo="Buscar nos casos do escritório"
      />
      <FileiraDeChips
        total={casos.length}
        chips={[
          {
            rotulo: "Sem responsável",
            casa: casos.filter((caso) => caso.advogadoId === null).length,
            ativo: soSemResponsavel,
            aoAlternar: () => setSoSemResponsavel((atual) => !atual),
          },
          {
            rotulo: "Aguardando resposta",
            casa: casos.filter((caso) => caso.urgente).length,
            ativo: soUrgentes,
            aoAlternar: () => setSoUrgentes((atual) => !atual),
          },
          {
            rotulo: "Em andamento",
            casa: casos.filter((caso) => !caso.encerrado).length,
            ativo: soEmAndamento,
            aoAlternar: () => setSoEmAndamento((atual) => !atual),
          },
        ]}
      />

      {visiveis.length === 0 ? (
        <NadaEncontrado
          mensagem={`Nenhum caso combina com esse filtro. Os ${casos.length} ${plural} aqui.`}
          aoLimpar={() => {
            setTermo("");
            setSoEmAndamento(false);
            setSoSemResponsavel(false);
            setSoUrgentes(false);
          }}
        />
      ) : (
        <div className="lista-empilhada">
          {visiveis.map((caso) => (
            <Link
              key={caso.id}
              href={`${baseHref}/${caso.id}`}
              className={
                caso.id === ativoId ? "cartao-de-lista ativa" : "cartao-de-lista"
              }
              aria-current={caso.id === ativoId ? "page" : undefined}
            >
              <span className="avatar pequeno" aria-hidden>
                {caso.iniciaisDoCliente}
              </span>
              <span className="conteudo">
                {/* O QUE IMPORTA PRIMEIRO. Cliente e área na primeira linha
                    (é como o escritório fala do caso: "o trabalhista do
                    João"); o título completo na segunda; e o RESPONSÁVEL
                    numa linha própria, com o estado ao lado, para nunca
                    mais ficar truncado no fim de outra frase. */}
                <span className="titulo">
                  {caso.cliente}
                  <span className="area">{caso.area}</span>
                  {caso.urgente && (
                    <span className="selo dourado">Aguardando resposta</span>
                  )}
                </span>
                <p className="linha-2">{caso.titulo}</p>
                <p className="linha-meta">
                  <span
                    className={
                      caso.advogadoId === null ? "sem-responsavel" : undefined
                    }
                  >
                    {caso.advogadoId === null
                      ? "Sem responsável"
                      : caso.advogado}
                  </span>
                  <span className="separador" aria-hidden>
                    ·
                  </span>
                  <span>{caso.statusRotulo}</span>
                  {caso.proximoPasso !== "" && (
                    <>
                      <span className="separador" aria-hidden>
                        ·
                      </span>
                      <span className="proximo-passo">{caso.proximoPasso}</span>
                    </>
                  )}
                </p>
              </span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
