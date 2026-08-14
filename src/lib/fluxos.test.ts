import { describe, expect, test } from "vitest";

import {
  destinoInicial,
  ehGestor,
  escritorioDoSocio,
  normalizaPapeis,
  papeisDaLinha,
  papelPrincipal,
  rotuloDoPapel,
  vinculoCom,
  type VinculoDeEscritorio,
} from "./fluxos";

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

describe("destino inicial", () => {
  const firma: VinculoDeEscritorio = {
    id: "f1",
    nome: "Firma",
    iniciais: "FI",
    papeis: ["owner"],
  };
  const outra: VinculoDeEscritorio = {
    id: "f2",
    nome: "Outra",
    iniciais: "OU",
    papeis: ["intern"],
  };

  test("escritório vence, advogado depois, e o destino carrega o id", () => {
    // O webapp existe para o profissional trabalhar no computador: quem
    // tem escritório cai no escritório, mesmo sendo também advogado. O id
    // vai na rota porque quem tem duas bancas precisa saber qual abriu.
    expect(
      destinoInicial({
        equipeJurii: false,
        advogadoAprovado: true,
        escritorios: [firma],
      }),
    ).toBe("/escritorio/f1");
    expect(
      destinoInicial({
        equipeJurii: false,
        advogadoAprovado: true,
        escritorios: [],
      }),
    ).toBe("/advogado");
  });

  test("a preferência guardada escolhe entre os vínculos", () => {
    const fluxos = {
      equipeJurii: false,
      advogadoAprovado: false,
      escritorios: [firma, outra],
    };
    expect(destinoInicial(fluxos, "f2")).toBe("/escritorio/f2");
    // Preferência apontando para escritório de onde a pessoa saiu não pode
    // travar a entrada num contexto morto: cai no primeiro vínculo válido.
    expect(destinoInicial(fluxos, "f9")).toBe("/escritorio/f1");
  });

  test("funcionário da Jurii sem papel profissional vai para a REVISÃO", () => {
    // A área dele é revisar verificações, e não a porta que manda baixar o
    // aplicativo. Equipe Jurii não tem relação com papel de escritório.
    expect(
      destinoInicial({
        equipeJurii: true,
        advogadoAprovado: false,
        escritorios: [],
      }),
    ).toBe("/revisao");
  });

  test("sem papel profissional, a porta que explica o aplicativo", () => {
    // O webapp virou ferramenta de trabalho: cliente não tem mesa aqui, e
    // mandá-lo para uma tela vazia seria pior do que dizer onde é a área
    // dele. /cliente é essa porta.
    expect(
      destinoInicial({
        equipeJurii: false,
        advogadoAprovado: false,
        escritorios: [],
      }),
    ).toBe("/cliente");
  });
});

describe("vínculo pelo id da rota", () => {
  const fluxos = {
    equipeJurii: false,
    advogadoAprovado: false,
    escritorios: [
      { id: "f1", nome: "Firma", iniciais: "FI", papeis: ["owner" as const] },
      { id: "f2", nome: "Outra", iniciais: "OU", papeis: ["intern" as const] },
    ],
  };

  test("id de escritório alheio não vira vínculo", () => {
    // A razão de `vinculoCom` existir: o id chega da URL, isto é, do
    // cliente. Sem conferir contra a lista, trocar o id na barra de
    // endereço trocaria de escritório na tela.
    expect(vinculoCom(fluxos, "f3")).toBeNull();
    expect(vinculoCom(fluxos, "")).toBeNull();
    expect(vinculoCom(fluxos, null)).toBeNull();
  });

  test("o cargo é do vínculo, e não da pessoa", () => {
    // Sócia numa banca e estagiária em outra: as duas coisas ao mesmo
    // tempo, e é por isso que gestor se pergunta ao vínculo.
    expect(ehGestor(vinculoCom(fluxos, "f1")!)).toBe(true);
    expect(ehGestor(vinculoCom(fluxos, "f2")!)).toBe(false);
  });

});

describe("papéis do escritório", () => {
  test("normaliza na ordem canônica, sem duplicata", () => {
    expect(normalizaPapeis(["secretary", "owner", "owner", "lawyer"])).toEqual([
      "owner",
      "lawyer",
      "secretary",
    ]);
  });

  test("lista vazia vira advogado: o servidor recusa conjunto vazio", () => {
    expect(normalizaPapeis([])).toEqual(["lawyer"]);
  });

  test("o principal é o primeiro da ordem, não o primeiro digitado", () => {
    expect(papelPrincipal(["secretary", "admin"])).toBe("admin");
    expect(papelPrincipal(["intern"])).toBe("intern");
  });

  test("estagiário é papel de verdade, e era lido como advogado", () => {
    expect(papeisDaLinha(["intern"], null)).toEqual(["intern"]);
    expect(rotuloDoPapel("intern")).toBe("Estagiário");
  });

  test("a leitura também normaliza a ordem vinda do banco", () => {
    expect(papeisDaLinha(["lawyer", "owner"], null)).toEqual(["owner", "lawyer"]);
  });
});
