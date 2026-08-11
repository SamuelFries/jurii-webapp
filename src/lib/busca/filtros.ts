/**
 * A filtragem das listas, espelho de lib/utils/inbox_filters.dart no app,
 * com as MESMAS recusas deliberadas:
 *
 * - a prévia da última mensagem NÃO entra na busca de conversas: a lista só
 *   carrega a última, e procurar "audiência" respondendo "nada" quando a
 *   palavra existe no meio do histórico é filtro que enxerga um pedaço
 *   falando como se enxergasse tudo;
 * - "Sem advogado definido" é rótulo do servidor, não gente: só entra na
 *   busca quando há advogado de verdade (advogadoId presente), senão
 *   digitar "sem" devolveria os casos órfãos como se existisse um advogado
 *   com esse nome.
 *
 * Tudo tipo simples (string/number/boolean) porque atravessa a fronteira
 * servidor -> cliente como JSON.
 */

import { buscaCasa, cnjCasa } from "./texto";

export interface ConversaParaTela {
  id: string;
  titulo: string;
  iniciais: string;
  avatarUrl: string | null;
  especialidade: string;
  ultimaMensagem: string;
  quando: string | null;
  naoLidas: number;
}

export interface CasoDoClienteParaTela {
  id: string;
  titulo: string;
  area: string;
  status: string;
  atualizadoEm: string;
  cnj: string | null;
  encerrado: boolean;
}

export interface SolicitacaoParaTela {
  id: string;
  titulo: string;
  area: string;
  resumo: string;
  solicitadoPor: string;
}

export interface CasoDoAdvogadoParaTela {
  id: string;
  titulo: string;
  cliente: string;
  iniciaisDoCliente: string;
  area: string;
  status: "updated" | "new_message" | "closed";
  cnj: string | null;
}

export interface CasoDoEscritorioParaTela {
  id: string;
  titulo: string;
  cliente: string;
  iniciaisDoCliente: string;
  advogadoId: string | null;
  advogado: string;
  area: string;
  statusRotulo: string;
  proximoPasso: string;
  urgente: boolean;
  encerrado: boolean;
  cnj: string | null;
}

export function filtraConversas(
  conversas: ConversaParaTela[],
  termo: string,
  soNaoLidas: boolean,
): ConversaParaTela[] {
  return conversas.filter((conversa) => {
    if (soNaoLidas && conversa.naoLidas === 0) return false;
    return buscaCasa(termo, [conversa.titulo, conversa.especialidade]);
  });
}

export function filtraCasosDoCliente(
  casos: CasoDoClienteParaTela[],
  termo: string,
  soEmAndamento: boolean,
): CasoDoClienteParaTela[] {
  return casos.filter((caso) => {
    if (soEmAndamento && caso.encerrado) return false;
    return (
      buscaCasa(termo, [caso.titulo, caso.area, caso.status]) ||
      cnjCasa(termo, caso.cnj)
    );
  });
}

/** As solicitações moram na mesma tela dos casos e obedecem à MESMA busca:
 * filtrar só os casos deixaria a seção de cima ignorando o que foi
 * digitado. */
export function filtraSolicitacoes(
  solicitacoes: SolicitacaoParaTela[],
  termo: string,
): SolicitacaoParaTela[] {
  return solicitacoes.filter((solicitacao) =>
    buscaCasa(termo, [
      solicitacao.titulo,
      solicitacao.area,
      solicitacao.solicitadoPor,
    ]),
  );
}

export function filtraCasosDoAdvogado(
  casos: CasoDoAdvogadoParaTela[],
  termo: string,
  soEmAndamento: boolean,
  soNovaMensagem: boolean,
): CasoDoAdvogadoParaTela[] {
  return casos.filter((caso) => {
    if (soEmAndamento && caso.status === "closed") return false;
    if (soNovaMensagem && caso.status !== "new_message") return false;
    return (
      buscaCasa(termo, [caso.cliente, caso.titulo, caso.area]) ||
      cnjCasa(termo, caso.cnj)
    );
  });
}

export function filtraCasosDoEscritorio(
  casos: CasoDoEscritorioParaTela[],
  termo: string,
  soEmAndamento: boolean,
  soSemResponsavel: boolean,
  soUrgentes: boolean,
): CasoDoEscritorioParaTela[] {
  return casos.filter((caso) => {
    if (soEmAndamento && caso.encerrado) return false;
    if (soSemResponsavel && caso.advogadoId !== null) return false;
    if (soUrgentes && !caso.urgente) return false;
    return (
      buscaCasa(termo, [
        caso.cliente,
        caso.titulo,
        caso.area,
        // Só nome de gente de verdade; ver a nota no topo do arquivo.
        ...(caso.advogadoId !== null ? [caso.advogado] : []),
      ]) || cnjCasa(termo, caso.cnj)
    );
  });
}
