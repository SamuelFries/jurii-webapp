import { describe, expect, test } from "vitest";

import { conversaDaLinha, rotuloDeHorario } from "./conversas";

describe("rótulo de horário", () => {
  // São Paulo é UTC-3 estável: o Brasil aboliu o horário de verão em 2019.
  const agora = new Date("2026-08-10T18:00:00Z"); // 15:00 em SP

  test("hoje, ontem e data cheia", () => {
    expect(rotuloDeHorario(new Date("2026-08-10T14:32:00-03:00"), agora)).toBe(
      "Hoje às 14:32",
    );
    expect(rotuloDeHorario(new Date("2026-08-09T21:10:00-03:00"), agora)).toBe(
      "Ontem às 21:10",
    );
    expect(rotuloDeHorario(new Date("2026-08-01T08:05:00-03:00"), agora)).toBe(
      "01/08 às 08:05",
    );
  });

  test("meia-noite em SP não vira o dia errado", () => {
    // 00:30 em SP do dia 10 é 03:30 UTC do dia 10: continua "Hoje".
    expect(rotuloDeHorario(new Date("2026-08-10T00:30:00-03:00"), agora)).toBe(
      "Hoje às 00:30",
    );
  });
});

describe("parse da conversa", () => {
  test("linha do RETURNS TABLE vira conversa sem inventar valor", () => {
    const conversa = conversaDaLinha({
      id: "c1",
      title: "Ana Souza",
      initials: "AS",
      avatar_url: null,
      specialty: "Dra. Marina Reis · Direito Cível",
      last_message: "combinado",
      last_message_at: "2026-08-10T12:00:00Z",
      unread_count: 2,
    });
    expect(conversa.titulo).toBe("Ana Souza");
    expect(conversa.naoLidas).toBe(2);
    expect(conversa.avatarUrl).toBeNull();
  });
});
