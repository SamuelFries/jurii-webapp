import { describe, expect, it } from "vitest";

import {
  itemAceso,
  lateralDaRevisao,
  lateralDoFluxo,
  type ItemDaLateral,
} from "./lateral";

const todasAsLaterais: [string, ItemDaLateral[]][] = [
  ["advogado", lateralDoFluxo.advogado],
  ["escritorio", lateralDoFluxo.escritorio],
  ["revisao", lateralDaRevisao],
];

function acesos(itens: ItemDaLateral[], caminho: string): string[] {
  return itens.filter((item) => itemAceso(item, caminho)).map((i) => i.rotulo);
}

describe("itemAceso", () => {
  it("acende no caminho exato", () => {
    expect(acesos(lateralDaRevisao, "/revisao")).toEqual(["Verificações"]);
  });

  it("acende por prefixo, para a tela filha ficar na sua seção", () => {
    // Detalhe do caso continua sendo "Casos": é o motivo de a regra padrão
    // ser por prefixo.
    expect(acesos(lateralDoFluxo.advogado, "/advogado/casos/abc-123")).toEqual([
      "Casos",
    ]);
  });

  it("acende pelo apelido declarado em tambem", () => {
    expect(acesos(lateralDoFluxo.advogado, "/advogado/conversas/9")).toEqual([
      "Mensagens",
    ]);
  });

  it("raiz de seção NÃO acende na tela filha", () => {
    // O bug real: sem `exata`, "Verificações" ficava acesa junto com
    // "Histórico" e a lateral parava de dizer onde a pessoa está.
    expect(acesos(lateralDaRevisao, "/revisao/historico")).toEqual([
      "Histórico",
    ]);
  });

  it.each(todasAsLaterais)(
    "na lateral de %s, cada rota acende no máximo um item",
    (_nome, itens) => {
      // A barreira: toda rota que a própria lateral declara, mais uma filha
      // de cada uma. Uma raiz de seção que esquecer `exata` acende junto com
      // a filha e derruba este teste.
      const rotas = itens.flatMap((item) => [
        item.href,
        `${item.href}/uma-filha`,
        ...(item.tambem ?? []).flatMap((prefixo) => [
          prefixo,
          `${prefixo}/uma-filha`,
        ]),
      ]);

      const ambiguas = rotas
        .map((rota) => ({ rota, acesos: acesos(itens, rota) }))
        .filter((linha) => linha.acesos.length > 1);

      expect(ambiguas).toEqual([]);
    },
  );
});
