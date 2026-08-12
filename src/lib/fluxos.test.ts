import { describe, expect, test } from "vitest";

import {
  destinoInicial,
  normalizaPapeis,
  papeisDaLinha,
  papelPrincipal,
  rotuloDoPapel,
} from "./fluxos";

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

describe("papéis do escritório", () => {
  test("normaliza na ordem canônica, sem duplicata", () => {
    expect(normalizaPapeis(["secretary", "owner", "owner", "lawyer"])).toEqual([
      "owner",
      "lawyer",
      "secretary",
    ]);
  });

  test("lista vazia vira advogado: o servidor recusa conjunto vazio", () => {
    expect(normalizaPapeis([])).toEqual(["lawyer"]);
  });

  test("o principal é o primeiro da ordem, não o primeiro digitado", () => {
    expect(papelPrincipal(["secretary", "admin"])).toBe("admin");
    expect(papelPrincipal(["intern"])).toBe("intern");
  });

  test("estagiário é papel de verdade, e era lido como advogado", () => {
    expect(papeisDaLinha(["intern"], null)).toEqual(["intern"]);
    expect(rotuloDoPapel("intern")).toBe("Estagiário");
  });

  test("a leitura também normaliza a ordem vinda do banco", () => {
    expect(papeisDaLinha(["lawyer", "owner"], null)).toEqual(["owner", "lawyer"]);
  });
});
