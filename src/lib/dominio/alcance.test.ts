import { describe, expect, test } from "vitest";

import {
  caminhosDoGrafico,
  dataCurta,
  diaDeAlcanceDaLinha,
  resumoDeAlcance,
} from "./alcance";

const dia = (dia: string, alcance: number, visitas = 0, conversas = 0) =>
  diaDeAlcanceDaLinha({
    day: dia,
    reach: alcance,
    profile_views: visitas,
    conversations: conversas,
  });

describe("resumo de alcance (a janela do app)", () => {
  test("últimos N dias na janela, o resto vira comparação", () => {
    const linhas = [
      dia("2026-08-01", 10),
      dia("2026-08-02", 10),
      dia("2026-08-08", 30, 6, 3),
      dia("2026-08-09", 30, 6, 0),
    ];
    const resumo = resumoDeAlcance(linhas, 2);
    expect(resumo.alcance).toBe(60);
    expect(resumo.alcanceAnterior).toBe(20);
    expect(resumo.visitas).toBe(12);
    expect(resumo.conversas).toBe(3);
  });

  test("as taxas do funil, e nulo sem base (nada de dividir por zero)", () => {
    const resumo = resumoDeAlcance([dia("2026-08-09", 100, 25, 5)], 7);
    expect(resumo.taxaDeVisita).toBe(25);
    expect(resumo.taxaDeConversa).toBe(20);

    const zerado = resumoDeAlcance([], 7);
    expect(zerado.taxaDeVisita).toBeNull();
    expect(zerado.taxaDeConversa).toBeNull();
  });

  test("linhas fora de ordem não bagunçam a janela", () => {
    const resumo = resumoDeAlcance(
      [dia("2026-08-09", 30), dia("2026-08-01", 10)],
      1,
    );
    expect(resumo.alcance).toBe(30);
    expect(resumo.alcanceAnterior).toBe(10);
  });
});


describe("a variação e a série do resumo", () => {
  test("variação em fração, e nula sem base (como reachChange)", () => {
    const linhas = [
      dia("2026-08-01", 10),
      dia("2026-08-09", 15),
    ];
    const resumo = resumoDeAlcance(linhas, 1);
    expect(resumo.variacao).toBe(0.5);
    expect(resumoDeAlcance([dia("2026-08-09", 15)], 1).variacao).toBeNull();
  });

  test("a série exibida é a janela ordenada", () => {
    const resumo = resumoDeAlcance(
      [dia("2026-08-09", 3), dia("2026-08-08", 2), dia("2026-08-01", 9)],
      2,
    );
    expect(resumo.serie.map((d) => d.dia)).toEqual(["2026-08-08", "2026-08-09"]);
  });
});

describe("os caminhos do gráfico", () => {
  test("curva suave: cúbicas com controle no meio, não linha quebrada", () => {
    const caminhos = caminhosDoGrafico(
      [dia("2026-08-08", 0), dia("2026-08-09", 10)],
      100,
      50,
    );
    expect(caminhos?.linha).toBe("M 0 50 C 50 50, 50 0, 100 0");
    expect(caminhos?.area).toBe("M 0 50 C 50 50, 50 0, 100 0 L 100 50 L 0 50 Z");
  });

  test("série toda zerada fica no CHÃO, não no teto", () => {
    // Sem o piso 1 na escala, 0/0 desenharia a linha no topo, parecendo
    // alcance cheio.
    const caminhos = caminhosDoGrafico(
      [dia("2026-08-08", 0), dia("2026-08-09", 0)],
      100,
      50,
    );
    expect(caminhos?.linha).toBe("M 0 50 C 50 50, 50 50, 100 50");
  });

  test("série vazia não desenha; data curta é dd/MM", () => {
    expect(caminhosDoGrafico([], 100, 50)).toBeNull();
    expect(dataCurta("2026-08-05")).toBe("05/08");
  });
});
