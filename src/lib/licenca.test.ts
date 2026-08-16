import { describe, expect, test } from "vitest";

import {
  assinaturaDaLinha,
  assinaturaViva,
  descontoAnualPercent,
  diasRestantesDeTeste,
  formataPreco,
  planoDaLinha,
  precoMensalDoAnual,
  rotuloDaEquipe,
  rotuloDeStatus,
  rotuloPorAdvogado,
  testeVencido,
  type Plano,
} from "./licenca";

/** Os TRÊS planos de produção, com os preços reais (migration
 * 20260824120000 do repo do app). Se os números mudarem lá, mudam aqui:
 * é o mesmo contrato que o app trava no teste dele. */
const producao: Plano[] = [
  {
    code: "essencial",
    name: "Essencial",
    maxLawyers: 3,
    monthlyPriceCents: 14900,
    annualPriceCents: 148800,
    sortOrder: 10,
  },
  {
    code: "escritorio",
    name: "Escritório",
    maxLawyers: 10,
    monthlyPriceCents: 34900,
    annualPriceCents: 348000,
    sortOrder: 20,
  },
  {
    code: "banca",
    name: "Banca",
    maxLawyers: 25,
    monthlyPriceCents: 69900,
    annualPriceCents: 696000,
    sortOrder: 30,
  },
];

describe("preço", () => {
  test("sem centavos quando redondo, com quando não é", () => {
    expect(formataPreco(34900)).toBe("R$ 349");
    expect(formataPreco(123450)).toBe("R$ 1.234,50");
    expect(formataPreco(0)).toBe("R$ 0");
  });

  test("os três planos de produção dão equivalente mensal inteiro", () => {
    // Os preços anuais foram ESCOLHIDOS para esta divisão dar reais
    // inteiros, porque é o número que a tela mostra.
    expect(precoMensalDoAnual(producao[0])).toBe("R$ 124");
    expect(precoMensalDoAnual(producao[1])).toBe("R$ 290");
    expect(precoMensalDoAnual(producao[2])).toBe("R$ 580");
  });

  test("os três planos arredondam para 17% de desconto", () => {
    // Decisão de produto: o selo diz 17, e diz porque os preços dão 17,
    // não porque alguém escreveu 17.
    for (const plano of producao) {
      expect(descontoAnualPercent(plano)).toBe(17);
    }
  });

  test("plano sem preço anual não tem selo nem equivalente", () => {
    const semAnual = { ...producao[0], annualPriceCents: null };
    expect(precoMensalDoAnual(semAnual)).toBeNull();
    expect(descontoAnualPercent(semAnual)).toBeNull();
  });
});

describe("rótulos", () => {
  test("equipe e preço por advogado", () => {
    expect(rotuloDaEquipe(producao[0])).toBe("Até 3 advogados");
    expect(rotuloDaEquipe({ ...producao[0], maxLawyers: null })).toBe(
      "Sem limite de advogados",
    );
    expect(rotuloPorAdvogado(producao[1])).toBe("~R$ 35 por advogado");
  });

  test("status em teste conta os dias, e não diz '0 restantes' para sempre", () => {
    const assinatura = assinaturaDaLinha({
      id: "s1",
      plan_code: "banca",
      status: "trialing",
      billing_cycle: "annual",
      trial_ends_at: "2026-09-07T12:00:00Z",
      law_firm_license_plans: {
        code: "banca",
        name: "Banca",
        max_lawyers: 25,
        monthly_price_cents: 69900,
        annual_price_cents: 696000,
        sort_order: 30,
      },
    });

    const antes = new Date("2026-08-15T12:00:00Z");
    expect(diasRestantesDeTeste(assinatura, antes)).toBe(23);
    expect(rotuloDeStatus(assinatura, antes)).toBe(
      "Banca · anual · teste grátis, 23 dias restantes",
    );

    // TESTE VENCIDO TEM NOME PRÓPRIO. Enquanto vencer não tinha consequência,
    // "teste grátis" ainda passava; agora que o escritório para de convidar
    // advogados (20260906120000), dizer "grátis" seria mentir no momento em
    // que a pessoa precisa entender o que mudou.
    const depois = new Date("2026-10-01T12:00:00Z");
    expect(rotuloDeStatus(assinatura, depois)).toBe(
      "Banca · anual · teste encerrado",
    );
    expect(assinaturaViva(assinatura, antes)).toBe(true);
    expect(assinaturaViva(assinatura, depois)).toBe(false);

    // O último dia é o último dia, e não "0 dias restantes".
    const ultimoDia = new Date("2026-09-07T00:00:00Z");
    expect(rotuloDeStatus(assinatura, ultimoDia)).toBe(
      "Banca · anual · teste grátis, último dia",
    );
    expect(assinaturaViva(assinatura, ultimoDia)).toBe(true);
  });

  test("teste sem data de fim vale como vencido, e não como eterno", () => {
    // Entre errar para o lado de cobrar e errar para o lado de liberar para
    // sempre, este é o lado seguro. Mesma escolha do banco.
    const semData = assinaturaDaLinha({
      id: "s0",
      plan_code: "essencial",
      status: "trialing",
      trial_ends_at: null,
    });
    expect(testeVencido(semData, new Date())).toBe(true);
    expect(assinaturaViva(semData, new Date())).toBe(false);
  });

  test("status pagos", () => {
    const base = assinaturaDaLinha({
      id: "s1",
      plan_code: "escritorio",
      status: "active",
      billing_cycle: "monthly",
    });
    expect(rotuloDeStatus(base, new Date())).toBe("escritorio · ativo");
    expect(
      rotuloDeStatus({ ...base, status: "past_due" }, new Date()),
    ).toBe("escritorio · pagamento pendente");
  });
});

describe("parse", () => {
  test("linha do banco com nulos não explode nem inventa valor", () => {
    const plano = planoDaLinha({ code: "x", name: null, max_lawyers: null });
    expect(plano.maxLawyers).toBeNull();
    expect(plano.monthlyPriceCents).toBe(0);
    expect(plano.annualPriceCents).toBeNull();
  });
});
