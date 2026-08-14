import { describe, expect, test } from "vitest";

import { caminhoInterno, comParametro } from "./caminho-seguro";

describe("caminho interno", () => {
  test("caminho de casa passa inteiro, com querystring", () => {
    expect(caminhoInterno("/escritorio/f1/mensagens", "/")).toBe(
      "/escritorio/f1/mensagens",
    );
    expect(caminhoInterno("/escritorio/f1/conversas/1?aba=equipe", "/")).toBe(
      "/escritorio/f1/conversas/1?aba=equipe",
    );
  });

  test("as três cargas que FURAVAM o filtro antigo", () => {
    // Todas passavam por `startsWith("/") && !startsWith("//")` e o
    // navegador resolvia http://evil.com/.
    expect(caminhoInterno("/\\\\evil.com", "/casa")).toBe("/casa");
    expect(caminhoInterno("/\\/evil.com", "/casa")).toBe("/casa");
    expect(caminhoInterno("/\t/evil.com", "/casa")).toBe("/casa");
  });

  test("as formas óbvias de sair continuam bloqueadas", () => {
    expect(caminhoInterno("//evil.com", "/casa")).toBe("/casa");
    expect(caminhoInterno("https://evil.com", "/casa")).toBe("/casa");
    expect(caminhoInterno("javascript:alert(1)", "/casa")).toBe("/casa");
    expect(caminhoInterno("http:/\\/evil.com", "/casa")).toBe("/casa");
  });

  test("valor ausente, vazio ou de outro tipo cai no padrão", () => {
    expect(caminhoInterno(null, "/casa")).toBe("/casa");
    expect(caminhoInterno("", "/casa")).toBe("/casa");
    expect(caminhoInterno(42, "/casa")).toBe("/casa");
  });

  test("o hash é descartado: não serve num redirecionamento de servidor", () => {
    expect(caminhoInterno("/casos/1#nota", "/")).toBe("/casos/1");
  });

  test("parâmetro respeita a querystring existente e escapa o valor", () => {
    expect(comParametro("/casos", "erro", "não deu")).toBe(
      "/casos?erro=n%C3%A3o%20deu",
    );
    expect(comParametro("/casos?aba=x", "ok", "sim")).toBe("/casos?aba=x&ok=sim");
  });
});
