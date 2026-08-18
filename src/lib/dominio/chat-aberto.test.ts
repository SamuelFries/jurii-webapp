import { describe, expect, test } from "vitest";

import {
  clienteAguarda,
  comecaSequencia,
  primeiroNome,
  resolveAutor,
  rotuloDoPapelNaConversa,
  separadorDeDia,
} from "./chat-aberto";

const equipe = [
  { profileId: "s1", nome: "Marina Sangiogo", papeis: ["owner" as const] },
  { profileId: "a1", nome: "Rafael Herzer", papeis: ["lawyer" as const] },
  { profileId: "p1", nome: "Paula Weber", papeis: ["secretary" as const] },
];
const ctx = { meuId: "p1", nomeDoCliente: "Joao Pereira", equipe };

describe("autor da mensagem", () => {
  test("cliente vem pelo sender_type, com o nome da conversa", () => {
    expect(resolveAutor({ senderId: "c1", senderType: "client" }, ctx)).toEqual({
      id: "c1", nome: "Joao Pereira", papel: "Cliente", lado: "cliente",
    });
  });

  test("equipe vem pelo mapa, com PRIMEIRO nome e o papel na equipe", () => {
    // O papel é o da pessoa na equipe: é o que faz a secretária saber que
    // aquela resposta foi da sócia, e não dela mesma nem do advogado.
    expect(resolveAutor({ senderId: "s1", senderType: "lawyer" }, ctx)).toEqual({
      id: "s1", nome: "Marina", papel: "Sócio", lado: "equipe",
    });
    expect(resolveAutor({ senderId: "a1", senderType: "lawyer" }, ctx).papel).toBe("Advogado");
    expect(resolveAutor({ senderId: "p1", senderType: "lawyer" }, ctx).papel).toBe("Secretária");
  });

  test("sistema não tem lado; membro que saiu vira 'Equipe', não um nome inventado", () => {
    expect(resolveAutor({ senderId: null, senderType: "system" }, ctx).lado).toBe("sistema");
    expect(resolveAutor({ senderId: "sumiu", senderType: "lawyer" }, ctx)).toEqual({
      id: "sumiu", nome: "Equipe", papel: "Equipe", lado: "equipe",
    });
  });

  test("papel na conversa segue a precedência da equipe", () => {
    expect(rotuloDoPapelNaConversa(["secretary", "owner"])).toBe("Sócio");
    expect(rotuloDoPapelNaConversa(["intern"])).toBe("Estagiário");
    expect(rotuloDoPapelNaConversa([])).toBe("Equipe");
    expect(primeiroNome("  Ana   Costa ")).toBe("Ana");
  });
});

describe("sequência e dia", () => {
  const t = (iso: string) => new Date(iso);
  test("nova sequência: primeira, autor diferente, ou mais de 10 min", () => {
    expect(comecaSequencia({ autorId: "a", criadaEm: t("2026-08-15T10:00:00Z") }, null)).toBe(true);
    expect(comecaSequencia(
      { autorId: "a", criadaEm: t("2026-08-15T10:05:00Z") },
      { autorId: "a", criadaEm: t("2026-08-15T10:00:00Z") },
    )).toBe(false);
    expect(comecaSequencia(
      { autorId: "b", criadaEm: t("2026-08-15T10:05:00Z") },
      { autorId: "a", criadaEm: t("2026-08-15T10:00:00Z") },
    )).toBe(true);
    expect(comecaSequencia(
      { autorId: "a", criadaEm: t("2026-08-15T10:11:00Z") },
      { autorId: "a", criadaEm: t("2026-08-15T10:00:00Z") },
    )).toBe(true);
  });

  test("separador de dia no fuso do Brasil: hoje, ontem, dd/mm, e ano só se outro", () => {
    const agora = t("2026-08-15T18:00:00-03:00");
    expect(separadorDeDia(t("2026-08-15T09:00:00-03:00"), null, agora)).toBe("Hoje");
    expect(separadorDeDia(t("2026-08-14T23:30:00-03:00"), null, agora)).toBe("Ontem");
    expect(separadorDeDia(t("2026-08-10T10:00:00-03:00"), null, agora)).toBe("10/08");
    expect(separadorDeDia(t("2025-12-31T10:00:00-03:00"), null, agora)).toBe("31/12/2025");
    // Mesmo dia da anterior: sem separador.
    expect(separadorDeDia(t("2026-08-15T09:00:00-03:00"), t("2026-08-15T08:00:00-03:00"), agora)).toBeNull();
    // A ARMADILHA do fuso: 23:30 em Brasília é 02:30 UTC do dia seguinte.
    // Em UTC seriam dois dias; no Brasil é o mesmo.
    expect(separadorDeDia(t("2026-08-14T23:30:00-03:00"), t("2026-08-14T20:00:00-03:00"), agora)).toBeNull();
  });
});

describe("quem precisa agir", () => {
  const t = (iso: string) => new Date(iso);
  test("cliente por último = aguarda desde aquela mensagem; sistema é ignorado", () => {
    const r = clienteAguarda([
      { lado: "equipe", criadaEm: t("2026-08-15T10:00:00Z") },
      { lado: "cliente", criadaEm: t("2026-08-15T11:00:00Z") },
      { lado: "sistema", criadaEm: t("2026-08-15T12:00:00Z") },
    ]);
    expect(r).toEqual({ aguarda: true, desde: t("2026-08-15T11:00:00Z") });
  });
  test("equipe por último = ninguém aguarda; conversa vazia idem", () => {
    expect(clienteAguarda([
      { lado: "cliente", criadaEm: t("2026-08-15T10:00:00Z") },
      { lado: "equipe", criadaEm: t("2026-08-15T11:00:00Z") },
    ]).aguarda).toBe(false);
    expect(clienteAguarda([]).aguarda).toBe(false);
  });
});
