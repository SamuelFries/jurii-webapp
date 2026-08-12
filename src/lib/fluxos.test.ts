import { describe, expect, test } from "vitest";

import { destinoInicial, papeisDaLinha } from "./fluxos";

describe("papéis do vínculo", () => {
  test("array novo vence o texto legado", () => {
    expect(papeisDaLinha(["owner", "lawyer"], "admin")).toEqual([
      "owner",
      "lawyer",
    ]);
  });

  test("cai no texto legado quando o array não existe", () => {
    // O banco tem duas gerações de coluna (roles e member_role/role);
    // linha antiga não pode virar papel inventado.
    expect(papeisDaLinha(null, "secretary")).toEqual(["secretary"]);
    expect(papeisDaLinha(undefined, "owner")).toEqual(["owner"]);
  });

  test("lixo vira advogado, o papel de menor poder", () => {
    expect(papeisDaLinha(["gerente"], "chefe")).toEqual(["lawyer"]);
    expect(papeisDaLinha(null, null)).toEqual(["lawyer"]);
  });
});

describe("destino inicial", () => {
  test("escritório vence, advogado depois", () => {
    // O webapp existe para o profissional trabalhar no computador: quem
    // tem escritório cai no escritório, mesmo sendo também advogado.
    const escritorio = { id: "f1", nome: "Firma", papeis: ["owner" as const] };
    expect(destinoInicial({ advogadoAprovado: true, escritorio })).toBe(
      "/escritorio",
    );
    expect(destinoInicial({ advogadoAprovado: true, escritorio: null })).toBe(
      "/advogado",
    );
  });

  test("sem papel profissional, a porta que explica o aplicativo", () => {
    // O webapp virou ferramenta de trabalho: cliente não tem mesa aqui, e
    // mandá-lo para uma tela vazia seria pior do que dizer onde é a área
    // dele. /cliente é essa porta.
    expect(destinoInicial({ advogadoAprovado: false, escritorio: null })).toBe(
      "/cliente",
    );
  });
});
