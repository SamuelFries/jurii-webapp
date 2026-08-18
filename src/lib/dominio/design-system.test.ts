import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

/**
 * Barreira do design system.
 *
 * A auditoria de 18/08 achou 14 tamanhos de fonte, 9 raios e 8 sombras no
 * CSS, com um `12.5px` solto. O refinamento consolidou tudo em tokens; este
 * teste existe para que a consolidação dure por BARREIRA, e não por lembrança
 * de quem revisa o PR. Ele lê o CSS de verdade e conta o que está fora da
 * escala. O teto tolera o legado que ainda não foi migrado; o que ele
 * proíbe é CRESCER.
 */
const css = readFileSync("src/app/globals.css", "utf8");

// Só o CSS de tela: o bloco de tokens (:root) DEFINE os valores e é onde os
// px têm que estar.
const semTokens = css.replace(/:root\s*\{[^}]*\}/g, "");

function ocorrencias(regex: RegExp): string[] {
  return [...semTokens.matchAll(regex)].map((m) => m[0]);
}

describe("design system", () => {
  test("nenhum tamanho de fonte fracionário ou fora da escala", () => {
    // 12.5px, 13.5px etc. são o sintoma de "ajustei no olho".
    const fracionarios = ocorrencias(/font-size:\s*\d+\.\d+px/g);
    expect(fracionarios, fracionarios.join(", ")).toEqual([]);
  });

  test("tamanhos de fonte em px crus não passam do legado tolerado", () => {
    // O ideal é var(--t-*). O legado é o CSS antigo que a migração ainda não
    // alcançou; a barreira impede que ele aumente.
    const crus = ocorrencias(/font-size:\s*\d+px/g);
    const TETO_LEGADO = 60;
    expect(
      crus.length,
      `${crus.length} font-size em px cru; use var(--t-xs|sm|base|md|lg|xl|2xl)`,
    ).toBeLessThanOrEqual(TETO_LEGADO);
  });

  test("raios vêm dos três tokens ou da pílula", () => {
    // Raio solto (8px, 10px, 16px) é o que faz dois cartões vizinhos
    // parecerem de produtos diferentes.
    const soltos = ocorrencias(/border-radius:\s*[^;]+/g).filter(
      (r) => !/var\(|:\s*0\b|50%|999px/.test(r),
    );
    const TETO_LEGADO = 20;
    expect(
      soltos.length,
      `${soltos.length} border-radius fora dos tokens: ${soltos.slice(0, 5).join(" | ")}`,
    ).toBeLessThanOrEqual(TETO_LEGADO);
  });

  test("sombra pesada só nos três níveis", () => {
    const soltas = ocorrencias(/box-shadow:\s*0\s+\d+px\s+\d+px[^;]+/g).filter(
      (s) => !s.includes("var(--"),
    );
    // As de foco (0 0 0 3px) e as inset não contam: são anel e fio, não sombra.
    const TETO_LEGADO = 8;
    expect(
      soltas.length,
      `${soltas.length} box-shadow fora de --shadow-sm|md|lg`,
    ).toBeLessThanOrEqual(TETO_LEGADO);
  });

  test("os breakpoints são dois: 720 e 1024", () => {
    const cortes = new Set(
      [...semTokens.matchAll(/@media\s*\((?:min|max)-width:\s*(\d+)px\)/g)].map(
        (m) => Number(m[1]),
      ),
    );
    // max-width usa N-1 (719/1023); min-width usa N (720/1024).
    for (const corte of cortes) {
      expect([719, 720, 1023, 1024], `breakpoint solto: ${corte}px`).toContain(
        corte,
      );
    }
  });

  test("os tokens de escala existem no :root", () => {
    for (const token of [
      "--t-xs", "--t-sm", "--t-base", "--t-md", "--t-lg", "--t-xl", "--t-2xl",
      "--s-1", "--s-2", "--s-3", "--s-4", "--s-6", "--s-8",
      "--radius", "--radius-sm", "--radius-pill",
      "--shadow-sm", "--shadow-md", "--shadow-lg",
      "--anel-foco", "--mov-rapido", "--mov-normal",
      "--aviso", "--aviso-fundo", "--sucesso-fundo",
    ]) {
      expect(css, `token ausente: ${token}`).toContain(`${token}:`);
    }
  });

  test("todo token do claro tem par no escuro quando é cor", () => {
    // Um token de cor definido só no claro deixa o escuro herdando o claro:
    // é o bug de "texto navy sobre fundo navy" que a auditoria pegou nas
    // barras de carga.
    const claro = css.match(/:root\s*\{([^}]*)\}/)?.[1] ?? "";
    const escuro =
      css.match(/prefers-color-scheme: dark\)\s*\{\s*:root\s*\{([^}]*)\}/)?.[1] ??
      "";
    const coresDoClaro = [...claro.matchAll(/(--[a-z0-9-]+):\s*#[0-9a-f]{3,8}/gi)].map(
      (m) => m[1],
    );
    const faltando = coresDoClaro.filter((t) => !escuro.includes(`${t}:`));
    // navy e gold são fixos por desenho (a marca), e não têm par.
    const permitidos = new Set(["--navy", "--navy-2", "--gold", "--gold-soft"]);
    expect(
      faltando.filter((t) => !permitidos.has(t)),
      "cores sem par no tema escuro",
    ).toEqual([]);
  });
});
