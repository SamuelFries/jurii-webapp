import { describe, expect, test } from "vitest";

import { areasDoDireito } from "./areas";

describe("áreas canônicas", () => {
  test("são 39, únicas, e as âncoras do produto estão lá", () => {
    expect(areasDoDireito).toHaveLength(39);
    expect(new Set(areasDoDireito).size).toBe(39);
    for (const ancora of [
      "Direito Trabalhista",
      "Direito Criminal",
      "Direito Médico e da Saúde",
    ]) {
      expect(areasDoDireito).toContain(ancora);
    }
  });
});
