import Link from "next/link";

import type { CasoDoEscritorioParaTela } from "@/lib/busca/filtros";

import { Icone } from "./icone";

/**
 * O painel direito de Casos quando nenhum caso está aberto: a carteira em
 * uma olhada, e não uma frase num vazio.
 *
 * Responde "como está a carteira agora?": quantos sem responsável (o único
 * grupo em que ninguém sequer sabe que precisa agir), quantos com cliente
 * esperando, quantos em andamento e quem carrega quanto. São os mesmos casos
 * da lista ao lado, agrupados; nada de dado novo.
 */
export function ResumoDaCarteira({
  casos,
  baseHref,
}: {
  casos: CasoDoEscritorioParaTela[];
  baseHref: string;
}) {
  if (casos.length === 0) {
    return (
      <div className="painel-vazio">
        <Icone nome="casos" tamanho={28} className="icone-do-vazio" />
        <p className="titulo-do-vazio">Nenhum caso ainda</p>
        <p>
          Casos nascem quando um cliente aceita a proposta de um advogado do
          escritório. Eles aparecem na lista ao lado e abrem aqui.
        </p>
      </div>
    );
  }

  const abertos = casos.filter((caso) => !caso.encerrado);
  const semResponsavel = abertos.filter((caso) => caso.advogadoId === null);
  const aguardando = abertos.filter((caso) => caso.urgente);
  const encerrados = casos.length - abertos.length;

  // Carga por responsável, do mais carregado para o menos.
  const porAdvogado = new Map<string, number>();
  for (const caso of abertos) {
    if (caso.advogadoId === null) continue;
    porAdvogado.set(caso.advogado, (porAdvogado.get(caso.advogado) ?? 0) + 1);
  }
  const carga = [...porAdvogado.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <div className="resumo-da-caixa">
      <div className="cabecalho-do-resumo">
        <div>
          <p className="titulo-do-resumo">
            {abertos.length === 1
              ? "1 caso em andamento"
              : `${abertos.length} casos em andamento`}
          </p>
          {/* Só fala de encerrados quando há: "2 no total" repetiria o
              título e ocuparia a linha para nada. */}
          {encerrados > 0 && (
            <p className="detalhe">
              {encerrados} {encerrados === 1 ? "encerrado" : "encerrados"} ·{" "}
              {casos.length} no total
            </p>
          )}
        </div>
      </div>

      <div className="blocos-do-resumo">
        <div className={semResponsavel.length > 0 ? "bloco atencao" : "bloco"}>
          <span className="valor">{semResponsavel.length}</span>
          <span className="rotulo">
            {semResponsavel.length === 1 ? "sem responsável" : "sem responsável"}
          </span>
        </div>
        <div className={aguardando.length > 0 ? "bloco atencao" : "bloco"}>
          <span className="valor">{aguardando.length}</span>
          <span className="rotulo">aguardando resposta</span>
        </div>
        <div className="bloco">
          <span className="valor">{carga.length}</span>
          <span className="rotulo">
            {carga.length === 1 ? "responsável" : "responsáveis"}
          </span>
        </div>
      </div>

      {semResponsavel.length > 0 && (
        <>
          <p className="subtitulo-do-resumo">Precisam de responsável</p>
          <ol className="fila-de-espera">
            {semResponsavel.slice(0, 5).map((caso) => (
              <li key={caso.id}>
                <Link href={`${baseHref}/${caso.id}`} className="item-da-fila">
                  <span className="avatar pequeno" aria-hidden>
                    {caso.iniciaisDoCliente}
                  </span>
                  <span className="conteudo">
                    <span className="titulo">{caso.cliente}</span>
                    <span className="previa">{caso.titulo}</span>
                  </span>
                  <span className="sinais">
                    <span className="detalhe">{caso.area}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </>
      )}

      {carga.length > 0 && (
        <>
          <p className="subtitulo-do-resumo">Carga por responsável</p>
          <ul className="carga-por-pessoa">
            {carga.map(([nome, quantos]) => (
              <li key={nome}>
                <span className="nome">{nome}</span>
                <span className="barra" aria-hidden>
                  <span
                    className="cheio"
                    style={{ width: `${(quantos / carga[0][1]) * 100}%` }}
                  />
                </span>
                <span className="quantos">
                  {quantos} {quantos === 1 ? "caso" : "casos"}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
