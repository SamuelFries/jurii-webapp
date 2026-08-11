/** Do domínio (com Date) para a fronteira servidor -> cliente (JSON puro). */

import type {
  CasoDoAdvogadoParaTela,
  CasoDoClienteParaTela,
  CasoDoEscritorioParaTela,
  ConversaParaTela,
  SolicitacaoParaTela,
} from "./filtros";
import type { Conversa } from "@/lib/dominio/conversas";
import { rotuloDeHorario } from "@/lib/dominio/conversas";
import type {
  CasoDoAdvogado,
  CasoDoCliente,
  CasoDoEscritorio,
  SolicitacaoDeCaso,
} from "@/lib/dominio/casos";

export function conversaParaTela(
  conversa: Conversa,
  agora: Date,
): ConversaParaTela {
  return {
    id: conversa.id,
    titulo: conversa.titulo,
    iniciais: conversa.iniciais,
    avatarUrl: conversa.avatarUrl,
    especialidade: conversa.especialidade,
    ultimaMensagem: conversa.ultimaMensagem,
    quando:
      conversa.ultimaMensagemEm === null
        ? null
        : rotuloDeHorario(conversa.ultimaMensagemEm, agora),
    naoLidas: conversa.naoLidas,
  };
}

export function casoDoClienteParaTela(
  caso: CasoDoCliente,
): CasoDoClienteParaTela {
  return { ...caso };
}

export function solicitacaoParaTela(
  solicitacao: SolicitacaoDeCaso,
): SolicitacaoParaTela {
  return {
    id: solicitacao.id,
    titulo: solicitacao.titulo,
    area: solicitacao.area,
    resumo: solicitacao.resumo,
    solicitadoPor: solicitacao.solicitadoPor,
  };
}

export function casoDoAdvogadoParaTela(
  caso: CasoDoAdvogado,
): CasoDoAdvogadoParaTela {
  return {
    id: caso.id,
    titulo: caso.titulo,
    cliente: caso.cliente,
    iniciaisDoCliente: caso.iniciaisDoCliente,
    area: caso.area,
    status: caso.status,
    cnj: caso.cnj,
  };
}

export function casoDoEscritorioParaTela(
  caso: CasoDoEscritorio,
): CasoDoEscritorioParaTela {
  return {
    id: caso.id,
    titulo: caso.titulo,
    cliente: caso.cliente,
    iniciaisDoCliente: caso.iniciaisDoCliente,
    advogadoId: caso.advogadoId,
    advogado: caso.advogado,
    area: caso.area,
    statusRotulo: caso.statusRotulo,
    proximoPasso: caso.proximoPasso,
    urgente: caso.urgente,
    encerrado: caso.encerrado,
    cnj: caso.cnj,
  };
}
