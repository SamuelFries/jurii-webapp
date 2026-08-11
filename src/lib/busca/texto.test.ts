import { describe, expect, test } from "vitest";

import { buscaCasa, chipUtil, cnjCasa, normalizaTexto } from "./texto";

describe("casamento de texto (as regras do app)", () => {
  test("acha sem acento e sem caixa", () => {
    expect(buscaCasa("jose", ["José da Silva"])).toBe(true);
    expect(buscaCasa("AÇÃO", ["ação trabalhista"])).toBe(true);
  });

  test("termo vazio casa com tudo; lista sem campo não casa", () => {
    expect(buscaCasa("", ["qualquer"])).toBe(true);
    expect(buscaCasa("ana", [])).toBe(false);
  });

  test("campo nulo é ignorado, não vira vazio que casa", () => {
    expect(buscaCasa("ana", [null, "Bruno"])).toBe(false);
    expect(buscaCasa("bruno", [null, "Bruno"])).toBe(true);
  });

  test("palavras podem vir de campos diferentes", () => {
    expect(buscaCasa("ana trabalhista", ["Ana Souza", "Direito Trabalhista"])).toBe(true);
    expect(buscaCasa("ana previdenciario", ["Ana Souza", "Direito Trabalhista"])).toBe(false);
  });
});

describe("CNJ por dígitos", () => {
  const cnj = "08012345620268260100";

  test("colado do tribunal com máscara acha", () => {
    expect(cnjCasa("0801234-56.2026.8.26.0100", cnj)).toBe(true);
    expect(cnjCasa("0801234", cnj)).toBe(true);
  });

  test("busca por nome não consulta o CNJ", () => {
    // Sem esta guarda, termo sem dígito viraria dígitos vazios, contidos em
    // todo número: "ana" devolveria todos os processos do mundo.
    expect(cnjCasa("ana", cnj)).toBe(false);
    expect(cnjCasa("", cnj)).toBe(false);
    expect(cnjCasa("99999", cnj)).toBe(false);
    expect(cnjCasa("0801234", null)).toBe(false);
  });
});

describe("chip só quando separa", () => {
  test("pega tudo não filtra; pega nada só esvazia", () => {
    expect(chipUtil(5, 5)).toBe(false);
    expect(chipUtil(0, 5)).toBe(false);
    expect(chipUtil(2, 5)).toBe(true);
  });
});

describe("normalização", () => {
  test("espelha a do app", () => {
    expect(normalizaTexto("  Ação; Trabalhista!  ")).toBe("acao trabalhista");
  });
});
