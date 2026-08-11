import { describe, expect, test } from "vitest";

import { diaDeAlcanceDaLinha, resumoDeAlcance } from "./alcance";

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
