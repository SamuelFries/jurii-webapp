import { describe, expect, test } from "vitest";

import {
  JANELA_APAGAR_PARA_TODOS_MS,
  podeApagarParaMim,
  podeApagarParaTodos,
  podeApagarSelecaoParaTodos,
  podeSelecionar,
  rotuloDoStatusDaSolicitacao,
  solicitacaoDaMetadata,
  estadoDeEntrega,
  rotuloDoEstadoDeEntrega,
} from "./chat";

const agora = new Date("2026-08-12T12:00:00Z");
const minutosAtras = (n: number) =>
  new Date(agora.getTime() - n * 60_000).toISOString();

const minha = {
  minha: true,
  criadaEmIso: minutosAtras(10),
  apagadaParaTodos: false,
  tipo: "texto" as const,
};

describe("o que dá para selecionar", () => {
  test("texto e anexo sim; cartão de caso e indicação NÃO", () => {
    expect(podeSelecionar(minha)).toBe(true);
    expect(podeSelecionar({ ...minha, tipo: "anexo" })).toBe(true);
    // São controles com botões próprios: marcar e agir no mesmo toque faria
    // alguém recusar um caso sem querer.
    expect(podeSelecionar({ ...minha, tipo: "solicitacao_de_caso" })).toBe(false);
    expect(podeSelecionar({ ...minha, tipo: "indicacao" })).toBe(false);
  });

  test("apagar para mim segue a mesma régua", () => {
    expect(podeApagarParaMim({ ...minha, minha: false })).toBe(true);
    expect(podeApagarParaMim({ ...minha, tipo: "indicacao" })).toBe(false);
  });
});

describe("apagar para todos: as quatro condições do servidor", () => {
  test("minha, recente, não apagada: pode", () => {
    expect(podeApagarParaTodos(minha, agora)).toBe(true);
  });

  test("mensagem do outro: não", () => {
    expect(podeApagarParaTodos({ ...minha, minha: false }, agora)).toBe(false);
  });

  test("já apagada não se apaga de novo", () => {
    expect(
      podeApagarParaTodos({ ...minha, apagadaParaTodos: true }, agora),
    ).toBe(false);
  });

  test("a janela de 60 horas: dentro pode, um minuto depois não", () => {
    const noLimite = new Date(
      agora.getTime() - JANELA_APAGAR_PARA_TODOS_MS + 60_000,
    ).toISOString();
    const passou = new Date(
      agora.getTime() - JANELA_APAGAR_PARA_TODOS_MS - 60_000,
    ).toISOString();
    expect(podeApagarParaTodos({ ...minha, criadaEmIso: noLimite }, agora)).toBe(
      true,
    );
    expect(podeApagarParaTodos({ ...minha, criadaEmIso: passou }, agora)).toBe(
      false,
    );
  });

  test("sem instante conhecido, não afirma que dá", () => {
    expect(podeApagarParaTodos({ ...minha, criadaEmIso: null }, agora)).toBe(
      false,
    );
    expect(
      podeApagarParaTodos({ ...minha, criadaEmIso: "não é data" }, agora),
    ).toBe(false);
  });
});

describe("a seleção inteira", () => {
  test("uma que não pode derruba a opção para todas", () => {
    const outra = { ...minha, minha: false };
    expect(podeApagarSelecaoParaTodos([minha, minha], agora)).toBe(true);
    expect(podeApagarSelecaoParaTodos([minha, outra], agora)).toBe(false);
  });

  test("seleção vazia não oferece nada", () => {
    expect(podeApagarSelecaoParaTodos([], agora)).toBe(false);
  });
});

describe("cartão de solicitação de caso", () => {
  test("lê título, área e status", () => {
    expect(
      solicitacaoDaMetadata({
        type: "case_request",
        case_request_id: "r1",
        title: "Rescisão indireta",
        area: "Direito Trabalhista",
        request_status: "accepted",
      }),
    ).toEqual({
      titulo: "Rescisão indireta",
      area: "Direito Trabalhista",
      status: "accepted",
    });
  });

  test("sem case_request_id não é cartão; status estranho vira pendente", () => {
    expect(
      solicitacaoDaMetadata({ type: "case_request", title: "x" }),
    ).toBeNull();
    expect(
      solicitacaoDaMetadata({
        type: "case_request",
        case_request_id: "r1",
        request_status: "sei_la",
      })?.status,
    ).toBe("pending");
  });

  test("os rótulos são os do app", () => {
    expect(rotuloDoStatusDaSolicitacao("accepted")).toBe("Caso aceito");
    expect(rotuloDoStatusDaSolicitacao("declined")).toBe("Caso recusado");
    expect(rotuloDoStatusDaSolicitacao("pending")).toBe(
      "Aguardando aceite do cliente",
    );
  });
});

describe("tique de entrega", () => {
  test("um risco, dois riscos, dois coloridos", () => {
    expect(estadoDeEntrega({ entregueEm: null, lidaEm: null })).toBe("enviada");
    expect(estadoDeEntrega({ entregueEm: "2026-08-12T12:00:00Z", lidaEm: null })).toBe(
      "entregue",
    );
    expect(
      estadoDeEntrega({
        entregueEm: "2026-08-12T12:00:00Z",
        lidaEm: "2026-08-12T12:01:00Z",
      }),
    ).toBe("lida");
  });

  test("lida vence entregue mesmo sem entrega registrada", () => {
    // read_at implica delivered_at no banco, mas a ordem aqui garante.
    expect(
      estadoDeEntrega({ entregueEm: null, lidaEm: "2026-08-12T12:01:00Z" }),
    ).toBe("lida");
  });

  test("cada estado tem rótulo para leitor de tela", () => {
    expect(rotuloDoEstadoDeEntrega("enviada")).toBe("Enviada");
    expect(rotuloDoEstadoDeEntrega("entregue")).toBe("Entregue");
    expect(rotuloDoEstadoDeEntrega("lida")).toBe("Visualizada");
  });
});
