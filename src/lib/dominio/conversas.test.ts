import { describe, expect, test } from "vitest";

import {
  conversaDaLinha,
  indicacaoDaMetadata,
  rotuloDeHorario,
} from "./conversas";

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

describe("indicação de advogado (espelho de fromMetadata do app)", () => {
  test("metadata completa vira card", () => {
    const indicacao = indicacaoDaMetadata({
      type: "lawyer_recommendation",
      lawyer_id: "adv1",
      lawyer_name: "Rita Souza",
      oab_label: "OAB/RS 123.456",
      primary_area: "Direito Cível",
      note: "Ela cuida de casos assim toda semana.",
    });
    expect(indicacao).toEqual({
      lawyerId: "adv1",
      nome: "Rita Souza",
      oab: "OAB/RS 123.456",
      area: "Direito Cível",
      nota: "Ela cuida de casos assim toda semana.",
    });
  });

  test("sem lawyer_id não há card (regra do app)", () => {
    expect(
      indicacaoDaMetadata({ type: "lawyer_recommendation", note: "x" }),
    ).toBeNull();
  });

  test("outro tipo de metadata não vira indicação", () => {
    expect(
      indicacaoDaMetadata({ type: "case_request", lawyer_id: "adv1" }),
    ).toBeNull();
  });

  test("nota vazia vira nula, não string em branco", () => {
    const indicacao = indicacaoDaMetadata({
      type: "lawyer_recommendation",
      lawyer_id: "adv1",
      note: "   ",
    });
    expect(indicacao?.nota).toBeNull();
    expect(indicacao?.nome).toBe("Advogado");
  });
});
