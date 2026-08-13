import { describe, expect, test } from "vitest";

import {
  caminhoDoDocumento,
  documentosDaVerificacao,
  estadosDaOab,
  nomeSeguroDeArquivo,
  numeroDaOab,
  rotuloDoStatusDaVerificacao,
  validaVerificacao,
  cnpjValido,
  mascaraDeCnpj,
  validaEscritorio,
  linhaDeDocumento,
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

describe("abertura de escritório", () => {
  const completo = {
    nome: "Fries Advogados",
    cnpj: "11.222.333/0001-81",
    telefone: "(51) 3333-0000",
    email: "contato@fries.adv.br",
    cep: "90540140",
    areas: ["Direito Trabalhista"],
    foto: { tamanho: 800_000, mime: "image/png" },
  };

  test("completo passa", () => {
    expect(validaEscritorio(completo)).toEqual([]);
  });

  test("CNPJ confere o dígito verificador", () => {
    expect(cnpjValido("11.222.333/0001-81")).toBe(true);
    expect(cnpjValido("11.222.333/0001-82")).toBe(false);
    // Todos iguais passam na conta mas não existem.
    expect(cnpjValido("11111111111111")).toBe(false);
    expect(cnpjValido("123")).toBe(false);
  });

  test("meio CEP é recusado aqui porque o banco recusa lá", () => {
    // O check do banco é `cep is null or cep ~ '^[0-9]{8}$'`.
    expect(validaEscritorio({ ...completo, cep: "90540" })[0].campo).toBe("cep");
    // Vazio é permitido: o escritório só fica sem distância na busca.
    expect(validaEscritorio({ ...completo, cep: "" })).toEqual([]);
  });

  test("sem área e sem foto, cada falta é apontada", () => {
    const problemas = validaEscritorio({ ...completo, areas: [], foto: null });
    expect(problemas.map((p) => p.campo).sort()).toEqual(["areas", "foto"]);
  });

  test("a máscara acompanha o que já foi digitado", () => {
    expect(mascaraDeCnpj("11222333000181")).toBe("11.222.333/0001-81");
    expect(mascaraDeCnpj("11222")).toBe("11.222");
  });
});

describe("a linha do documento no banco", () => {
  test("as chaves são as COLUNAS reais, com file_size_bytes", () => {
    // `size_bytes` foi para produção e o PostgREST recusou o INSERT
    // inteiro em silêncio: os arquivos subiam e a fila dizia "sem
    // documento". Este teste trava os nomes contra a tabela real.
    const linha = linhaDeDocumento({
      verificacaoId: "v1",
      usuarioId: "u1",
      tipo: "oab_card",
      titulo: "Carteira da OAB",
      caminho: "u1/oab_card-1-doc.png",
      mime: "image/png",
      tamanho: 12345,
    });
    expect(Object.keys(linha).sort()).toEqual([
      "document_type",
      "file_size_bytes",
      "mime_type",
      "storage_path",
      "title",
      "user_id",
      "verification_id",
    ]);
    expect(linha.file_size_bytes).toBe(12345);
  });
});
