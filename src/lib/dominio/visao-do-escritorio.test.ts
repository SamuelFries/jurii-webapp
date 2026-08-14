import { describe, expect, test } from "vitest";

import {
  passosDoEscritorio,
  progressoDoEscritorio,
  type EstadoDoEscritorio,
} from "./visao-do-escritorio";

const completo: EstadoDoEscritorio = {
  apresentacao:
    "Banca trabalhista em Porto Alegre, atendendo empregados e empresas desde 2011.",
  areas: ["Direito Trabalhista"],
  cep: "90540140",
  telefone: "(51) 3333-0000",
  email: "contato@fries.adv.br",
  diasComHorario: 5,
  pessoasNaEquipe: 3,
};

describe("os passos do escritório", () => {
  test("cadastro completo não pede nada", () => {
    expect(passosDoEscritorio(completo, "f1")).toEqual([]);
    expect(progressoDoEscritorio(completo)).toEqual({ feitos: 6, total: 6 });
  });

  test("escritório recém-aprovado vê os seis", () => {
    // É o estado da tela que motivou isto: quatro zeros e meia tela vazia.
    const novo: EstadoDoEscritorio = {
      apresentacao: "",
      areas: [],
      cep: "",
      telefone: "",
      email: "",
      diasComHorario: 0,
      pessoasNaEquipe: 1,
    };
    expect(passosDoEscritorio(novo, "f1").map((p) => p.chave)).toEqual([
      "areas",
      "cep",
      "apresentacao",
      "horarios",
      "contato",
      "equipe",
    ]);
    expect(progressoDoEscritorio(novo)).toEqual({ feitos: 0, total: 6 });
  });

  test("a ordem põe primeiro o que impede o cliente de ACHAR", () => {
    const semAcharNemEscolher = {
      ...completo,
      areas: [],
      apresentacao: "",
    };
    expect(passosDoEscritorio(semAcharNemEscolher, "f1").map((p) => p.chave)).toEqual([
      "areas",
      "apresentacao",
    ]);
  });

  test("meio CEP não conta como endereço", () => {
    // O banco só aceita 8 dígitos ou nulo, e a distância depende dele.
    expect(
      passosDoEscritorio({ ...completo, cep: "90540" }, "f1").map((p) => p.chave),
    ).toEqual(["cep"]);
    expect(
      passosDoEscritorio({ ...completo, cep: "90540-140" }, "f1"),
    ).toEqual([]);
  });

  test("apresentação de uma palavra não conta como apresentação", () => {
    expect(
      passosDoEscritorio({ ...completo, apresentacao: "Advocacia." }, "f1").map(
        (p) => p.chave,
      ),
    ).toEqual(["apresentacao"]);
  });

  test("um contato basta", () => {
    expect(passosDoEscritorio({ ...completo, telefone: "" }, "f1")).toEqual([]);
    expect(passosDoEscritorio({ ...completo, email: "" }, "f1")).toEqual([]);
    expect(
      passosDoEscritorio({ ...completo, telefone: "  ", email: "" }, "f1").map(
        (p) => p.chave,
      ),
    ).toEqual(["contato"]);
  });

  test("equipe de um pede convite; de dois, não", () => {
    expect(
      passosDoEscritorio({ ...completo, pessoasNaEquipe: 1 }, "f1").map(
        (p) => p.chave,
      ),
    ).toEqual(["equipe"]);
    expect(passosDoEscritorio({ ...completo, pessoasNaEquipe: 2 }, "f1")).toEqual([]);
  });

  test("todo passo aponta para uma tela que resolve", () => {
    const vazio: EstadoDoEscritorio = {
      apresentacao: "",
      areas: [],
      cep: "",
      telefone: "",
      email: "",
      diasComHorario: 0,
      pessoasNaEquipe: 1,
    };
    for (const passo of passosDoEscritorio(vazio, "f1")) {
      // O id do escritório é OBRIGATÓRIO no caminho: a rota do fluxo é
      // /escritorio/{id}/..., e um passo sem ele levaria a pessoa para a
      // guarda em vez da tela que resolve a pendência.
      expect(passo.href).toMatch(/^\/escritorio\/f1\/(perfil|equipe)$/);
      expect(passo.porque.length).toBeGreaterThan(30);
    }
  });

  test("o passo aponta para a banca aberta, e não para uma fixa", () => {
    const vazio: EstadoDoEscritorio = {
      apresentacao: "",
      areas: [],
      cep: "",
      telefone: "",
      email: "",
      diasComHorario: 0,
      pessoasNaEquipe: 1,
    };
    expect(passosDoEscritorio(vazio, "f2")[0].href).toBe(
      "/escritorio/f2/perfil",
    );
  });
});
