import { describe, expect, test } from "vitest";

import {
  diasDeEspera,
  detalheDaFicha,
  documentosQueFaltam,
  esperaDesde,
  type FichaParaRevisar,
  dataDaDecisao,
  quemDecidiu,
  rotuloDaDecisao,
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

const quatroDoEscritorio = [
  "cnpj_registration",
  "articles_of_association",
  "address_proof",
  "owner_identity",
];

describe("o que falta para decidir", () => {
  test("advogado precisa dos três", () => {
    expect(
      documentosQueFaltam(
        ficha("lawyer", ["identity", "oab_card", "professional_photo"]),
      ),
    ).toEqual([]);
    expect(documentosQueFaltam(ficha("lawyer", ["identity"]))).toEqual([
      "oab_card",
      "professional_photo",
    ]);
  });

  test("escritório precisa dos quatro", () => {
    expect(documentosQueFaltam(ficha("law_firm", quatroDoEscritorio))).toEqual(
      [],
    );
    expect(
      documentosQueFaltam(ficha("law_firm", ["cnpj_registration"])),
    ).toEqual(["articles_of_association", "address_proof", "owner_identity"]);
  });

  test("a foto do escritório NÃO conta como documento", () => {
    // Ela vai para law-firm-avatars e vira avatar_storage_path, nunca uma
    // linha de documento. Enquanto era exigida aqui, toda ficha de
    // escritório dizia "falta 1 documento", inclusive as completas.
    expect(documentosQueFaltam(ficha("law_firm", quatroDoEscritorio))).toEqual(
      [],
    );
    // E sozinha ela não completa nada.
    expect(documentosQueFaltam(ficha("law_firm", ["profile_photo"]))).toEqual(
      quatroDoEscritorio,
    );
  });

  test("documento a mais não vira falta", () => {
    expect(
      documentosQueFaltam(
        ficha("law_firm", [...quatroDoEscritorio, "profile_photo"]),
      ),
    ).toEqual([]);
  });
});

describe("o detalhe da ficha", () => {
  test("CNPJ de escritório sai mascarado", () => {
    // Quem revisa confere esse número contra a Receita, e catorze dígitos
    // corridos é onde a leitura erra.
    expect(detalheDaFicha("law_firm", "CNPJ 11222333000181")).toBe(
      "CNPJ 11.222.333/0001-81",
    );
  });

  test("detalhe de advogado passa intocado", () => {
    expect(detalheDaFicha("lawyer", "Direito Trabalhista")).toBe(
      "Direito Trabalhista",
    );
  });

  test("cadastro antigo sem CNPJ não vira lixo", () => {
    // A RPC devolve 'CNPJ ?' quando a coluna está nula.
    expect(detalheDaFicha("law_firm", "CNPJ ?")).toBe("CNPJ ?");
  });
});

describe("histórico", () => {
  test("quem decidiu é dito, inclusive quando não há revisor", () => {
    // As decisões anteriores ao painel não têm reviewer_id, e deixar em
    // branco pareceria que ninguém decidiu.
    expect(quemDecidiu("Ana Revisora")).toBe("Ana Revisora");
    expect(quemDecidiu(null)).toBe("antes do painel existir");
  });

  test("rótulo da decisão", () => {
    expect(rotuloDaDecisao("approved")).toBe("Aprovada");
    expect(rotuloDaDecisao("rejected")).toBe("Recusada");
  });

  test("data cheia, e sem data não inventa", () => {
    expect(dataDaDecisao(null)).toBe("sem data");
    expect(dataDaDecisao("não é data")).toBe("sem data");
    expect(dataDaDecisao("2026-08-13T18:30:00Z")).toMatch(/13\/08\/2026/);
  });
});
