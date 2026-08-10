import { describe, expect, test } from "vitest";

import { cpfValido, mascaraDeCpf, nomeCompleto } from "./validadores";

describe("cpf", () => {
  test("dígito verificador de verdade, o algoritmo do app", () => {
    // 529.982.247-25 é o CPF de exemplo clássico com verificador correto.
    expect(cpfValido("529.982.247-25")).toBe(true);
    expect(cpfValido("52998224725")).toBe(true);
    expect(cpfValido("529.982.247-26")).toBe(false);
  });

  test("onze dígitos iguais não passam, mesmo com verificador consistente", () => {
    expect(cpfValido("111.111.111-11")).toBe(false);
    expect(cpfValido("00000000000")).toBe(false);
  });

  test("tamanho errado não passa", () => {
    expect(cpfValido("1234567890")).toBe(false);
  });

  test("máscara acompanha a digitação", () => {
    expect(mascaraDeCpf("529")).toBe("529");
    expect(mascaraDeCpf("5299822")).toBe("529.982.2");
    expect(mascaraDeCpf("52998224725")).toBe("529.982.247-25");
  });
});

describe("nome completo", () => {
  test("uma palavra só não identifica ninguém num contrato", () => {
    expect(nomeCompleto("Samuel")).toBe(false);
    expect(nomeCompleto("Samuel Fries")).toBe(true);
    expect(nomeCompleto("  Ana   Souza  ")).toBe(true);
  });
});
