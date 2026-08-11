"use client";

import Link from "next/link";
import { useState } from "react";

import { responderSolicitacao } from "@/app/casos/acoes";
import {
  filtraCasosDoCliente,
  filtraSolicitacoes,
  type CasoDoClienteParaTela,
  type SolicitacaoParaTela,
} from "@/lib/busca/filtros";

import { CampoDeBusca, FileiraDeChips, NadaEncontrado } from "./controles";

/**
 * Casos do cliente com a busca do app. As solicitações pendentes obedecem à
 * MESMA busca: filtrar só os casos deixaria a seção de cima ignorando o que
 * foi digitado.
 */
export function CasosDoClienteComBusca({
  casos,
  solicitacoes,
}: {
  casos: CasoDoClienteParaTela[];
  solicitacoes: SolicitacaoParaTela[];
}) {
  const [termo, setTermo] = useState("");
  const [soEmAndamento, setSoEmAndamento] = useState(false);

  const total = casos.length + solicitacoes.length;
  if (total === 0) {
    return (
      <p className="vazio">
        Quando um advogado propuser um caso na conversa e você aceitar, ele
        aparece aqui.
      </p>
    );
  }

  const casosVisiveis = filtraCasosDoCliente(casos, termo, soEmAndamento);
  // O chip "Em andamento" não corta solicitações: pendente É andamento.
  const solicitacoesVisiveis = filtraSolicitacoes(solicitacoes, termo);
  const nadaVisivel =
    casosVisiveis.length === 0 && solicitacoesVisiveis.length === 0;
  const plural = total === 1 ? "item continua" : "itens continuam";

  return (
    <>
      <CampoDeBusca
        valor={termo}
        aoMudar={setTermo}
        placeholder="Buscar por título, área ou processo"
        rotulo="Buscar nos seus casos"
      />
      <FileiraDeChips
        total={total}
        chips={[
          {
            rotulo: "Em andamento",
            casa:
              casos.filter((caso) => !caso.encerrado).length +
              solicitacoes.length,
            ativo: soEmAndamento,
            aoAlternar: () => setSoEmAndamento((atual) => !atual),
          },
        ]}
      />

      {nadaVisivel && (
        <NadaEncontrado
          mensagem={`Nenhum caso combina com esse filtro. Seus ${total} ${plural} aqui.`}
          aoLimpar={() => {
            setTermo("");
            setSoEmAndamento(false);
          }}
        />
      )}

      {solicitacoesVisiveis.length > 0 && (
        <>
          <h2 className="secao">Solicitações pendentes</h2>
          <div className="lista-empilhada">
            {solicitacoesVisiveis.map((solicitacao) => (
              <div key={solicitacao.id} className="cartao">
                <div className="linha-topo">
                  <strong>{solicitacao.titulo}</strong>
                  <span className="selo">{solicitacao.area}</span>
                </div>
                <p className="detalhe">Proposto por {solicitacao.solicitadoPor}</p>
                {solicitacao.resumo !== "" && (
                  <p className="detalhe">{solicitacao.resumo}</p>
                )}
                <div className="acoes-em-linha">
                  <form action={responderSolicitacao}>
                    <input type="hidden" name="id" value={solicitacao.id} />
                    <input type="hidden" name="aceitar" value="nao" />
                    <button type="submit" className="secundario">
                      Recusar
                    </button>
                  </form>
                  <form action={responderSolicitacao}>
                    <input type="hidden" name="id" value={solicitacao.id} />
                    <input type="hidden" name="aceitar" value="sim" />
                    <button type="submit">Aceitar caso</button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {casosVisiveis.length > 0 && (
        <>
          <h2 className="secao">Casos em andamento</h2>
          <div className="lista-empilhada">
            {casosVisiveis.map((caso) => (
              <Link
                key={caso.id}
                href={`/casos/${caso.id}`}
                className="cartao-de-lista"
              >
                <span className="conteudo">
                  <span className="titulo">{caso.titulo}</span>
                  <p className="linha-2">
                    {caso.area}
                    {caso.atualizadoEm !== "" ? ` · ${caso.atualizadoEm}` : ""}
                  </p>
                  {caso.cnj !== null && (
                    <p className="linha-2">Processo {caso.cnj}</p>
                  )}
                </span>
                <span className="selo">{caso.status}</span>
              </Link>
            ))}
          </div>
        </>
      )}
    </>
  );
}
