"use client";

import Link from "next/link";
import { useState } from "react";

import {
  filtraCasosDoAdvogado,
  type CasoDoAdvogadoParaTela,
} from "@/lib/busca/filtros";

import { CampoDeBusca, FileiraDeChips, NadaEncontrado } from "./controles";

const rotuloDeStatus = {
  updated: "Atualizado",
  new_message: "Nova mensagem",
  closed: "Encerrado",
} as const;

export function CasosDoAdvogadoComBusca({
  casos,
  ativoId,
}: {
  casos: CasoDoAdvogadoParaTela[];
  ativoId?: string;
}) {
  const [termo, setTermo] = useState("");
  const [soEmAndamento, setSoEmAndamento] = useState(false);
  const [soNovaMensagem, setSoNovaMensagem] = useState(false);

  if (casos.length === 0) {
    return (
      <p className="vazio">
        Nenhum caso ativo. Abra a conversa com o cliente para propor um.
      </p>
    );
  }

  const visiveis = filtraCasosDoAdvogado(
    casos,
    termo,
    soEmAndamento,
    soNovaMensagem,
  );
  const plural = casos.length === 1 ? "caso continua" : "casos continuam";

  return (
    <>
      <CampoDeBusca
        valor={termo}
        aoMudar={setTermo}
        placeholder="Buscar por cliente, título ou processo"
        rotulo="Buscar nos seus casos"
      />
      <FileiraDeChips
        total={casos.length}
        chips={[
          {
            rotulo: "Nova mensagem",
            casa: casos.filter((caso) => caso.status === "new_message").length,
            ativo: soNovaMensagem,
            aoAlternar: () => setSoNovaMensagem((atual) => !atual),
          },
          {
            rotulo: "Em andamento",
            casa: casos.filter((caso) => caso.status !== "closed").length,
            ativo: soEmAndamento,
            aoAlternar: () => setSoEmAndamento((atual) => !atual),
          },
        ]}
      />

      {visiveis.length === 0 ? (
        <NadaEncontrado
          mensagem={`Nenhum caso combina com esse filtro. Seus ${casos.length} ${plural} aqui.`}
          aoLimpar={() => {
            setTermo("");
            setSoEmAndamento(false);
            setSoNovaMensagem(false);
          }}
        />
      ) : (
        <div className="lista-empilhada">
          {visiveis.map((caso) => (
            <Link
              key={caso.id}
              href={`/advogado/casos/${caso.id}`}
              className={
                caso.id === ativoId ? "cartao-de-lista ativa" : "cartao-de-lista"
              }
              aria-current={caso.id === ativoId ? "page" : undefined}
            >
              <span className="avatar" aria-hidden>
                {caso.iniciaisDoCliente}
              </span>
              <span className="conteudo">
                <span className="titulo">{caso.titulo}</span>
                <p className="linha-2">
                  {caso.cliente} · {caso.area}
                </p>
                {caso.cnj !== null && (
                  <p className="linha-2">Processo {caso.cnj}</p>
                )}
              </span>
              <span
                className={caso.status === "new_message" ? "selo dourado" : "selo"}
              >
                {rotuloDeStatus[caso.status]}
              </span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
