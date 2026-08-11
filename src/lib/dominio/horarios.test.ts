import { describe, expect, test } from "vitest";

import { estrelas } from "./avaliacoes";
import { agrupaPorDia, intervaloDaLinha } from "./horarios";

describe("horário de atendimento", () => {
  test("agrupa intervalos por dia na convenção do app (1 = segunda)", () => {
    const dias = agrupaPorDia(
      [
        { weekday: 1, opens_at: "09:00:00", closes_at: "12:00:00" },
        { weekday: 1, opens_at: "14:00:00", closes_at: "18:00:00" },
        { weekday: 6, opens_at: "09:00:00", closes_at: "12:00:00" },
      ].map(intervaloDaLinha),
    );
    expect(dias).toEqual([
      { dia: "Segunda", horarios: "09:00 às 12:00, 14:00 às 18:00" },
      { dia: "Sábado", horarios: "09:00 às 12:00" },
    ]);
  });

  test("weekday fora de 1..7 é descartado, não vira dia fantasma", () => {
    expect(
      agrupaPorDia([{ weekday: 0, abre: "09:00", fecha: "10:00" }]),
    ).toEqual([]);
  });
});

describe("estrelas", () => {
  test("nota vira estrelas cheias e vazias, com teto e piso", () => {
    expect(estrelas(4)).toBe("★★★★☆");
    expect(estrelas(4.6)).toBe("★★★★★");
    expect(estrelas(0)).toBe("☆☆☆☆☆");
    expect(estrelas(9)).toBe("★★★★★");
  });
});
