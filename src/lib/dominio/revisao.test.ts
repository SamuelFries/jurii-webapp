import { describe, expect, test } from "vitest";

import {
  diasDeEspera,
  documentosQueFaltam,
  esperaDesde,
  type FichaParaRevisar,
} from "./revisao";

const agora = new Date("2026-08-13T18:00:00Z");
const atras = (ms: number) => new Date(agora.getTime() - ms).toISOString();

const ficha = (tipo: "lawyer" | "law_firm", tipos: string[]): FichaParaRevisar => ({
  id: "v1",
  tipo,
  titulo: "OAB 123/RS",
  detalhe: "Direito Cível",
  pessoa: "Rita",
  email: null,
  enviadaEmIso: null,
  documentos: tipos.map((t) => ({
    tipo: t,
    titulo: t,
    caminho: `p/${t}`,
    bucket: "verification-documents",
    url: null,
  })),
});

describe("quanto tempo esperando", () => {
  test("minutos, horas e dias, com singular certo", () => {
    expect(esperaDesde(atras(30_000), agora)).toBe("agora");
    expect(esperaDesde(atras(15 * 60_000), agora)).toBe("há 15 min");
    expect(esperaDesde(atras(60 * 60_000), agora)).toBe("há 1 hora");
    expect(esperaDesde(atras(5 * 3_600_000), agora)).toBe("há 5 horas");
    expect(esperaDesde(atras(24 * 3_600_000), agora)).toBe("há 1 dia");
    expect(esperaDesde(atras(6 * 86_400_000), agora)).toBe("há 6 dias");
  });

  test("sem data não inventa tempo", () => {
    expect(esperaDesde(null, agora)).toBe("sem data");
    expect(esperaDesde("não é data", agora)).toBe("sem data");
    expect(diasDeEspera(null, agora)).toBeNull();
  });

  test("os dias servem para marcar o que envelheceu", () => {
    expect(diasDeEspera(atras(3 * 86_400_000), agora)).toBe(3);
    expect(diasDeEspera(atras(3_600_000), agora)).toBe(0);
  });
});

describe("o que falta para decidir", () => {
  test("advogado precisa dos três; escritório, da foto", () => {
    expect(
      documentosQueFaltam(
        ficha("lawyer", ["identity", "oab_card", "professional_photo"]),
      ),
    ).toEqual([]);
    expect(documentosQueFaltam(ficha("lawyer", ["identity"]))).toEqual([
      "oab_card",
      "professional_photo",
    ]);
    expect(documentosQueFaltam(ficha("law_firm", ["profile_photo"]))).toEqual([]);
    expect(documentosQueFaltam(ficha("law_firm", []))).toEqual(["profile_photo"]);
  });

  test("documento a mais não vira falta", () => {
    expect(
      documentosQueFaltam(ficha("law_firm", ["profile_photo", "identity"])),
    ).toEqual([]);
  });
});
