import { describe, expect, test } from "vitest";

import {
  atualizacaoDaLinha,
  detalheDoCasoDaLinha,
  formataCnj,
} from "./caso-detalhe";

describe("detalhe do caso", () => {
  test("as permissões vêm do servidor e nunca são inventadas", () => {
    // O DEFEITO QUE ISTO TRAVA: tela decidindo papel sozinha. can_manage e
    // can_manage_lifecycle são calculados pela RPC para ESTA pessoa neste
    // caso; ausência vira false, nunca true.
    const caso = detalheDoCasoDaLinha({ id: "c1", title: "Caso" });
    expect(caso.podeGerenciar).toBe(false);
    expect(caso.podeEncerrar).toBe(false);

    const gestor = detalheDoCasoDaLinha({
      id: "c1",
      title: "Caso",
      can_manage: true,
      can_manage_lifecycle: true,
      status: "closed",
    });
    expect(gestor.podeGerenciar).toBe(true);
    expect(gestor.podeEncerrar).toBe(true);
    expect(gestor.encerrado).toBe(true);
  });

  test("descrição em branco vira vazio, não a string 'null'", () => {
    expect(detalheDoCasoDaLinha({ id: "c", description: "   " }).descricao).toBe("");
    expect(detalheDoCasoDaLinha({ id: "c", description: null }).descricao).toBe("");
  });

  test("atualização sem autor cai no padrão do app", () => {
    const atualizacao = atualizacaoDaLinha({ id: "u1", title: "Audiência" });
    expect(atualizacao.autor).toBe("Jurii");
    expect(atualizacao.iniciaisDoAutor).toBe("JR");
  });
});

describe("máscara do CNJ", () => {
  test("20 dígitos crus ganham a máscara do tribunal", () => {
    expect(formataCnj("08012345620268260100")).toBe(
      "0801234-56.2026.8.26.0100",
    );
  });

  test("o que não tem 20 dígitos passa intacto, sem inventar máscara", () => {
    expect(formataCnj("12345")).toBe("12345");
  });
});
