import { describe, expect, test } from "vitest";

import {
  casoDoEscritorioDaLinha,
  statusDoCasoDoAdvogado,
} from "./casos";

describe("status do caso do advogado", () => {
  test("copia deriveLawyerCaseStatus do app, inclusive o legado", () => {
    expect(statusDoCasoDoAdvogado("closed")).toBe("closed");
    expect(statusDoCasoDoAdvogado("new_message")).toBe("new_message");
    // 'deadline' existe no enum do banco mas nenhum caminho o escreve
    // desde a 20260804120000: cai no padrão, como sempre caiu no app.
    expect(statusDoCasoDoAdvogado("deadline")).toBe("updated");
    expect(statusDoCasoDoAdvogado(null)).toBe("updated");
  });
});

describe("caso do escritório", () => {
  test("sem responsável vem com advogadoId nulo, não com nome fantasma", () => {
    const caso = casoDoEscritorioDaLinha({
      id: "c1",
      title: "Caso",
      client_name: "Ana",
      client_initials: "AS",
      assigned_lawyer_id: null,
      assigned_lawyer: "Sem advogado definido",
      area: "Direito Cível",
      status_label: "Em andamento",
      next_step: "",
      urgent: false,
    });
    expect(caso.advogadoId).toBeNull();
    // O rótulo continua disponível para exibir, mas quem decide é o id:
    // foi a regra da busca do app (digitar "sem" não acha advogado).
    expect(caso.advogado).toBe("Sem advogado definido");
  });
});
