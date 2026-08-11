import { describe, expect, test } from "vitest";

import {
  agrupaPorDiaDeAgenda,
  compromissoDaLinha,
  isoUtcParaLocal,
  localParaIsoUtc,
  rotuloDoDia,
  rotuloDoHorarioDoCompromisso,
} from "./agenda";

const agora = new Date("2026-08-11T18:00:00Z"); // 15:00 em SP

describe("rótulos de dia e hora (São Paulo, UTC-3)", () => {
  test("hoje, amanhã e data com dia da semana", () => {
    expect(rotuloDoDia(new Date("2026-08-11T20:00:00Z"), agora)).toBe("Hoje");
    expect(rotuloDoDia(new Date("2026-08-12T12:00:00Z"), agora)).toBe("Amanhã");
    expect(rotuloDoDia(new Date("2026-08-14T12:00:00Z"), agora)).toBe(
      "sexta, 14/08",
    );
  });

  test("faixa de horário do compromisso", () => {
    const compromisso = compromissoDaLinha({
      id: "a1",
      title: "Audiência",
      starts_at: "2026-08-14T12:00:00Z",
      ends_at: "2026-08-14T13:30:00Z",
    });
    expect(rotuloDoHorarioDoCompromisso(compromisso)).toBe("09:00 às 10:30");
  });
});

describe("conversão do datetime-local", () => {
  test("ida e volta preservam o horário de São Paulo", () => {
    // O input entrega hora LOCAL sem fuso; o banco guarda UTC. 09:00 em SP
    // é 12:00 UTC, e o caminho de volta devolve os mesmos dígitos.
    const iso = localParaIsoUtc("2026-08-14T09:00");
    expect(iso).toBe("2026-08-14T12:00:00.000Z");
    expect(isoUtcParaLocal(new Date(iso!))).toBe("2026-08-14T09:00");
  });

  test("valor fora do formato vira nulo, não data inventada", () => {
    expect(localParaIsoUtc("amanhã de manhã")).toBeNull();
    expect(localParaIsoUtc("")).toBeNull();
  });
});

describe("agrupamento por dia", () => {
  test("preserva a ordem e junta o mesmo dia", () => {
    const linhas = [
      { id: "1", title: "A", starts_at: "2026-08-11T20:00:00Z" },
      { id: "2", title: "B", starts_at: "2026-08-11T22:00:00Z" },
      { id: "3", title: "C", starts_at: "2026-08-12T12:00:00Z" },
    ].map(compromissoDaLinha);
    const grupos = agrupaPorDiaDeAgenda(linhas, agora);
    expect(grupos.map((g) => g.dia)).toEqual(["Hoje", "Amanhã"]);
    expect(grupos[0].itens.map((i) => i.id)).toEqual(["1", "2"]);
  });

  test("meia-noite em SP não escorrega de dia", () => {
    // 00:30 de 12/08 em SP = 03:30Z de 12/08: tem que cair em Amanhã, não
    // em Hoje.
    const grupos = agrupaPorDiaDeAgenda(
      [compromissoDaLinha({ id: "1", starts_at: "2026-08-12T03:30:00Z" })],
      agora,
    );
    expect(grupos[0].dia).toBe("Amanhã");
  });
});
