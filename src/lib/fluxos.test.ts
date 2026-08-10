import { describe, expect, test } from "vitest";

import { papeisDaLinha } from "./fluxos";

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
