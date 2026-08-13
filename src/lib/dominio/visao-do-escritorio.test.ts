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
    expect(passosDoEscritorio(completo)).toEqual([]);
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
    expect(passosDoEscritorio(novo).map((p) => p.chave)).toEqual([
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
    expect(passosDoEscritorio(semAcharNemEscolher).map((p) => p.chave)).toEqual([
      "areas",
      "apresentacao",
    ]);
  });

  test("meio CEP não conta como endereço", () => {
    // O banco só aceita 8 dígitos ou nulo, e a distância depende dele.
    expect(
      passosDoEscritorio({ ...completo, cep: "90540" }).map((p) => p.chave),
    ).toEqual(["cep"]);
    expect(
      passosDoEscritorio({ ...completo, cep: "90540-140" }),
    ).toEqual([]);
  });

  test("apresentação de uma palavra não conta como apresentação", () => {
    expect(
      passosDoEscritorio({ ...completo, apresentacao: "Advocacia." }).map(
        (p) => p.chave,
      ),
    ).toEqual(["apresentacao"]);
  });

  test("um contato basta", () => {
    expect(passosDoEscritorio({ ...completo, telefone: "" })).toEqual([]);
    expect(passosDoEscritorio({ ...completo, email: "" })).toEqual([]);
    expect(
      passosDoEscritorio({ ...completo, telefone: "  ", email: "" }).map(
        (p) => p.chave,
      ),
    ).toEqual(["contato"]);
  });

  test("equipe de um pede convite; de dois, não", () => {
    expect(
      passosDoEscritorio({ ...completo, pessoasNaEquipe: 1 }).map(
        (p) => p.chave,
      ),
    ).toEqual(["equipe"]);
    expect(passosDoEscritorio({ ...completo, pessoasNaEquipe: 2 })).toEqual([]);
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
    for (const passo of passosDoEscritorio(vazio)) {
      expect(passo.href).toMatch(/^\/escritorio\/(perfil|equipe)$/);
      expect(passo.porque.length).toBeGreaterThan(30);
    }
  });
});
