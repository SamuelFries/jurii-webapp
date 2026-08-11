import { describe, expect, test } from "vitest";

import { caminhoDoAnexo, nomeSeguro, validaAnexo } from "./anexos";

describe("validação de anexo (as réguas do servidor)", () => {
  test("imagem aceita até 5 MB, documento até 10 MB", () => {
    expect(validaAnexo("image/png", 4 * 1024 * 1024)).toEqual({ kind: "image" });
    expect(validaAnexo("image/png", 6 * 1024 * 1024)).toHaveProperty("erro");
    expect(validaAnexo("application/pdf", 9 * 1024 * 1024)).toEqual({
      kind: "document",
    });
    expect(validaAnexo("application/pdf", 11 * 1024 * 1024)).toHaveProperty(
      "erro",
    );
  });

  test("tipo fora da lista é recusado ANTES do upload", () => {
    expect(validaAnexo("video/mp4", 1024)).toHaveProperty("erro");
    expect(validaAnexo("application/zip", 1024)).toHaveProperty("erro");
  });

  test("arquivo vazio é recusado", () => {
    expect(validaAnexo("image/png", 0)).toHaveProperty("erro");
  });
});

describe("nome e caminho", () => {
  test("saneamento espelha o app", () => {
    expect(nomeSeguro("Contrato Final (v2)!!.pdf")).toBe("Contrato_Final_v2_.pdf");
    expect(nomeSeguro("../../etc/passwd")).toBe("passwd");
    expect(nomeSeguro("")).toBe("arquivo");
  });

  test("caminho fica na pasta do usuário, como a RPC exige", () => {
    expect(caminhoDoAnexo("u1", "c1", "doc.pdf", 123)).toBe("u1/c1/123-doc.pdf");
  });
});
