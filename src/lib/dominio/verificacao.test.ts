import { describe, expect, test } from "vitest";

import {
  caminhoDoDocumento,
  documentosDaVerificacao,
  estadosDaOab,
  nomeSeguroDeArquivo,
  numeroDaOab,
  rotuloDoStatusDaVerificacao,
  validaVerificacao,
} from "./verificacao";

const tresDocumentos = [
  { tipo: "identity", tamanho: 900_000, mime: "application/pdf" },
  { tipo: "oab_card", tamanho: 900_000, mime: "image/jpeg" },
  { tipo: "professional_photo", tamanho: 900_000, mime: "image/png" },
];

const completo = {
  oab: "123456",
  estado: "RS",
  areaPrincipal: "Direito Trabalhista",
  areas: ["Direito Trabalhista"],
  documentos: tresDocumentos,
};

describe("validação do envio", () => {
  test("completo passa sem problema", () => {
    expect(validaVerificacao(completo)).toEqual([]);
  });

  test("as três guardas do servidor: OAB, seccional e área", () => {
    // O servidor recusa com 'OAB number is required' e irmãs; validar aqui
    // é só não mandar o que ele já vai negar.
    expect(validaVerificacao({ ...completo, oab: "1" })[0].campo).toBe("oab");
    expect(validaVerificacao({ ...completo, estado: "XX" })[0].campo).toBe(
      "estado",
    );
    expect(validaVerificacao({ ...completo, areaPrincipal: "  " })[0].campo).toBe(
      "area",
    );
  });

  test("falta de documento é apontada por documento, não em bloco", () => {
    const problemas = validaVerificacao({ ...completo, documentos: [] });
    expect(problemas.map((p) => p.campo)).toEqual([
      "identity",
      "oab_card",
      "professional_photo",
    ]);
  });

  test("a foto profissional não aceita PDF: ela vira o avatar público", () => {
    const problemas = validaVerificacao({
      ...completo,
      documentos: [
        ...tresDocumentos.slice(0, 2),
        { tipo: "professional_photo", tamanho: 900_000, mime: "application/pdf" },
      ],
    });
    expect(problemas).toHaveLength(1);
    expect(problemas[0].mensagem).toContain("imagem");
  });

  test("arquivo acima de 10 MB é recusado antes de subir", () => {
    const problemas = validaVerificacao({
      ...completo,
      documentos: [
        { tipo: "identity", tamanho: 11 * 1024 * 1024, mime: "application/pdf" },
        ...tresDocumentos.slice(1),
      ],
    });
    expect(problemas[0].mensagem).toContain("10 MB");
  });
});

describe("caminho no storage, o mesmo do app", () => {
  test("{uid}/{tipo}-{micros}-{nome} com o nome higienizado", () => {
    expect(
      caminhoDoDocumento("u1", "oab_card", "carteira da OAB (1).pdf", 1770000000000000),
    ).toBe("u1/oab_card-1770000000000000-carteira_da_OAB_1_.pdf");
  });

  test("caminho de pasta no nome não vira pasta no bucket", () => {
    expect(nomeSeguroDeArquivo("../../etc/passwd")).toBe("passwd");
  });
});

describe("utilidades", () => {
  test("OAB fica só com dígitos; os 27 estados existem", () => {
    expect(numeroDaOab("123.456/RS")).toBe("123456");
    expect(estadosDaOab).toHaveLength(27);
  });

  test("os três documentos do catálogo do app", () => {
    expect(documentosDaVerificacao.map((d) => d.tipo)).toEqual([
      "identity",
      "oab_card",
      "professional_photo",
    ]);
  });

  test("rótulos de status", () => {
    expect(rotuloDoStatusDaVerificacao("pending")).toBe("Verificação em análise");
    expect(rotuloDoStatusDaVerificacao("rejected")).toBe("Verificação recusada");
  });
});
