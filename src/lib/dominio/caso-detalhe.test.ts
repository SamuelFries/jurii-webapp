import { describe, expect, test } from "vitest";

import {
  linhaDoTempoDoCaso,
  pendenciasDoCaso,
  type AtualizacaoDoCaso,
  type MovimentacaoDoProcesso,
} from "./caso-detalhe";

const t = (iso: string) => new Date(iso);

describe("linha do tempo única", () => {
  const atualizacoes: AtualizacaoDoCaso[] = [
    { id: "u1", titulo: "Documentos recebidos", corpo: "", autor: "Rafael Herzer", iniciaisDoAutor: "RH", criadaEm: t("2026-08-16T15:00:00Z") },
    { id: "u2", titulo: "Petição protocolada", corpo: "", autor: "Rafael Herzer", iniciaisDoAutor: "RH", criadaEm: t("2026-08-17T19:00:00Z") },
  ];
  const movimentacoes: MovimentacaoDoProcesso[] = [
    { id: "m1", titulo: "Distribuição", corpo: "", ocorridaEm: t("2026-08-17T20:00:00Z") },
    { id: "m2", titulo: "Audiência", corpo: "", ocorridaEm: t("2026-08-18T12:00:00Z") },
  ];

  test("mescla por data, mais recente primeiro, com a origem em cada evento", () => {
    const linha = linhaDoTempoDoCaso(atualizacoes, movimentacoes);
    expect(linha.map((e) => e.titulo)).toEqual([
      "Audiência", "Distribuição", "Petição protocolada", "Documentos recebidos",
    ]);
    expect(linha[0].rotuloDaOrigem).toBe("Tribunal");
    // Equipe leva o PRIMEIRO nome de quem registrou: é o que distingue
    // "veio do tribunal" de "veio da gente", e de quem da gente.
    expect(linha[2].rotuloDaOrigem).toBe("Equipe · Rafael");
    expect(linha[2].origem).toBe("equipe");
  });

  test("evento sem data vai para o FIM, nunca parece a última novidade", () => {
    const semData: MovimentacaoDoProcesso = { id: "m0", titulo: "Sem data", corpo: "", ocorridaEm: null };
    const linha = linhaDoTempoDoCaso(atualizacoes, [semData]);
    expect(linha[linha.length - 1].titulo).toBe("Sem data");
  });

  test("ids não colidem entre origens (mov-1 e upd-1 convivem)", () => {
    const linha = linhaDoTempoDoCaso(
      [{ id: "1", titulo: "a", corpo: "", autor: "X", iniciaisDoAutor: "X", criadaEm: t("2026-08-01T00:00:00Z") }],
      [{ id: "1", titulo: "b", corpo: "", ocorridaEm: t("2026-08-02T00:00:00Z") }],
    );
    expect(new Set(linha.map((e) => e.id)).size).toBe(2);
  });
});

describe("pendências do caso", () => {
  test("sem responsável e cliente aguardando são as duas que existem", () => {
    const p = pendenciasDoCaso({ encerrado: false, advogadoId: null, clienteAguardaDesde: t("2026-08-18T10:00:00Z") });
    expect(p.map((x) => x.tipo)).toEqual(["sem_responsavel", "cliente_aguarda"]);
  });
  test("caso encerrado não tem pendência, mesmo sem responsável", () => {
    expect(pendenciasDoCaso({ encerrado: true, advogadoId: null, clienteAguardaDesde: t("2026-08-18T10:00:00Z") })).toEqual([]);
  });
  test("com responsável e equipe por último: nada", () => {
    expect(pendenciasDoCaso({ encerrado: false, advogadoId: "a1", clienteAguardaDesde: null })).toEqual([]);
  });
});
