import { readdirSync, readFileSync, statSync } from "node:fs";

import { describe, expect, test } from "vitest";

/**
 * BARREIRA contra a volta do saneamento furado.
 *
 * O código já teve, em seis arquivos, a checagem
 * `caminho.startsWith("/") && !caminho.startsWith("//")`, que parece
 * suficiente e não é: barra invertida e tabulação furam, e o navegador
 * resolve para outro host. Este teste falha se alguém reintroduzir o
 * padrão em vez de usar caminhoInterno.
 *
 * Existe porque o defeito é CONVIDATIVO: a versão errada é mais curta,
 * parece óbvia, e ninguém desconfia dela lendo o diff.
 */
function varre(dir: string, achados: string[] = []): string[] {
  for (const nome of readdirSync(dir)) {
    const caminho = `${dir}/${nome}`;
    if (statSync(caminho).isDirectory()) varre(caminho, achados);
    else if (/\.tsx?$/.test(nome)) achados.push(caminho);
  }
  return achados;
}

describe("barreira do redirecionamento", () => {
  test("ninguém saneia destino comparando prefixo de string", () => {
    const culpados = varre("src")
      .filter((arquivo) => !arquivo.includes("caminho-seguro"))
      .filter((arquivo) => readFileSync(arquivo, "utf8").includes('startsWith("//")'));

    expect(culpados).toEqual([]);
  });
});
