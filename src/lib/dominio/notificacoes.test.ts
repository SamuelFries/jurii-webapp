import { describe, expect, test } from "vitest";

import {
  destinoDaNotificacao,
  notificacaoDaLinha,
} from "./notificacoes";

const comConversa = notificacaoDaLinha({
  id: "n1",
  title: "Nova mensagem",
  metadata: { conversation_id: "c1" },
});
const comCaso = notificacaoDaLinha({
  id: "n2",
  title: "Caso atualizado",
  metadata: { case_id: "k1" },
});
const informativa = notificacaoDaLinha({ id: "n3", title: "Aviso" });

describe("destino da notificação", () => {
  test("conversa abre no fluxo em que a pessoa está", () => {
    expect(destinoDaNotificacao(comConversa, "cliente")).toBe("/conversas/c1");
    expect(destinoDaNotificacao(comConversa, "advogado")).toBe(
      "/advogado/conversas/c1",
    );
  });

  test("escritório NUNCA abre conversa pela notificação, a regra do app", () => {
    // O chat do painel do escritório tem limites próprios; abrir pela
    // notificação os reintroduziria. Sobra o caso, que é neutro.
    expect(destinoDaNotificacao(comConversa, "escritorio")).toBeNull();
    expect(destinoDaNotificacao(comCaso, "escritorio")).toBe(
      "/escritorio/casos/k1",
    );
  });

  test("sem destino não vira link morto: é nulo e a tela não oferece Abrir", () => {
    expect(destinoDaNotificacao(informativa, "cliente")).toBeNull();
  });

  test("conversa vence caso quando a notificação tem os dois", () => {
    const dupla = notificacaoDaLinha({
      id: "n4",
      title: "x",
      metadata: { conversation_id: "c9", case_id: "k9" },
    });
    expect(destinoDaNotificacao(dupla, "cliente")).toBe("/conversas/c9");
    // No escritório, sem conversa, o caso assume.
    expect(destinoDaNotificacao(dupla, "escritorio")).toBe(
      "/escritorio/casos/k9",
    );
  });
});

describe("parse", () => {
  test("lida quando read_at existe; ids do metadata como texto", () => {
    const lida = notificacaoDaLinha({
      id: "n5",
      title: "x",
      read_at: "2026-08-10T12:00:00Z",
      metadata: { conversation_id: 123 },
    });
    expect(lida.lida).toBe(true);
    expect(lida.conversaId).toBe("123");
    expect(informativa.lida).toBe(false);
  });
});
