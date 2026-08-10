import { describe, expect, test } from "vitest";

import { provedorConfigurado } from "./provedor";

describe("provedor de pagamento", () => {
  test("enquanto a decisão está adiada, NENHUM provedor responde", () => {
    // O DEFEITO QUE ISTO TRAVA: alguém plugar um provedor de mentira "só
    // para testar" e ele vazar para produção. Enquanto a escolha (Stripe,
    // Asaas, Pagar.me, Iugu) não for tomada de verdade, o registro devolve
    // null, as telas não oferecem pagamento e o webhook responde 501.
    // Quando a escolha acontecer, este teste MORRE junto com a troca: ele
    // será substituído pelos testes do provedor real.
    expect(provedorConfigurado()).toBeNull();
  });
});
