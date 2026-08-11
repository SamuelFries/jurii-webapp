import { describe, expect, test } from "vitest";

import {
  filtraCasosDoEscritorio,
  filtraConversas,
  filtraSolicitacoes,
  type CasoDoEscritorioParaTela,
  type ConversaParaTela,
} from "./filtros";

const conversa = (extra: Partial<ConversaParaTela>): ConversaParaTela => ({
  id: "c",
  titulo: "Ana Souza",
  iniciais: "AS",
  avatarUrl: null,
  especialidade: "Direito Trabalhista",
  ultimaMensagem: "combinado audiência quinta",
  quando: null,
  naoLidas: 0,
  ...extra,
});

const casoDoEscritorio = (
  extra: Partial<CasoDoEscritorioParaTela>,
): CasoDoEscritorioParaTela => ({
  id: "k",
  titulo: "Caso",
  cliente: "Ana Souza",
  iniciaisDoCliente: "AS",
  advogadoId: null,
  advogado: "Sem advogado definido",
  area: "Direito Cível",
  statusRotulo: "Em andamento",
  proximoPasso: "",
  urgente: false,
  encerrado: false,
  cnj: null,
  ...extra,
});

describe("conversas (as recusas do app)", () => {
  test("a prévia da última mensagem NÃO entra na busca", () => {
    // A lista só carrega a última mensagem; achar por ela responderia
    // "nada" para palavra que existe no meio do histórico.
    expect(filtraConversas([conversa({})], "audiência", false)).toEqual([]);
    expect(filtraConversas([conversa({})], "ana", false)).toHaveLength(1);
    expect(filtraConversas([conversa({})], "trabalhista", false)).toHaveLength(1);
  });

  test("não lidas e busca se somam", () => {
    const lista = [
      conversa({ id: "1", naoLidas: 2 }),
      conversa({ id: "2", titulo: "Bruno Lima" }),
    ];
    expect(filtraConversas(lista, "", true)).toHaveLength(1);
    expect(filtraConversas(lista, "bruno", true)).toEqual([]);
  });
});

describe("casos do escritório (as recusas do app)", () => {
  test("'Sem advogado definido' é rótulo, não gente", () => {
    const lista = [casoDoEscritorio({})];
    expect(filtraCasosDoEscritorio(lista, "sem advogado", false, false, false)).toEqual([]);
    expect(filtraCasosDoEscritorio(lista, "definido", false, false, false)).toEqual([]);
  });

  test("advogado de verdade entra na busca", () => {
    const lista = [
      casoDoEscritorio({ advogadoId: "a1", advogado: "Dra. Marina Reis" }),
    ];
    expect(filtraCasosDoEscritorio(lista, "marina", false, false, false)).toHaveLength(1);
  });

  test("filtros se acumulam", () => {
    const lista = [
      casoDoEscritorio({ id: "1", urgente: true }),
      casoDoEscritorio({ id: "2", urgente: true, encerrado: true }),
      casoDoEscritorio({ id: "3" }),
    ];
    expect(
      filtraCasosDoEscritorio(lista, "", true, false, true).map((caso) => caso.id),
    ).toEqual(["1"]);
  });

  test("CNJ colado com máscara acha o caso", () => {
    const lista = [casoDoEscritorio({ cnj: "08012345620268260100" })];
    expect(
      filtraCasosDoEscritorio(lista, "0801234-56.2026.8.26.0100", false, false, false),
    ).toHaveLength(1);
  });
});

describe("solicitações", () => {
  test("obedecem à mesma busca da tela de casos", () => {
    const solicitacoes = [
      { id: "p", titulo: "Ação trabalhista", area: "Direito Trabalhista", resumo: "", solicitadoPor: "Ana Souza" },
    ];
    expect(filtraSolicitacoes(solicitacoes, "ana")).toHaveLength(1);
    expect(filtraSolicitacoes(solicitacoes, "bruno")).toEqual([]);
  });
});
