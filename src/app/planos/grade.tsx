"use client";

import { useState } from "react";

import {
  descontoAnualPercent,
  formataPreco,
  precoMensalDoAnual,
  rotuloDaEquipe,
  rotuloPorAdvogado,
  type CicloDeCobranca,
  type Plano,
} from "@/lib/licenca";

import { escolherPlano } from "./acoes";

/**
 * A grade de planos, com as MESMAS regras da tela do app
 * (jurii/lib/screens/firm_plan_screen.dart):
 *
 *  - anual é o ciclo inicial, com o selo de desconto CALCULADO dos preços;
 *  - o ciclo anual mostra só o equivalente mensal ("R$ 290 por mês"), nunca
 *    o total do ano, e o aviso "cobrados anualmente" fica numa linha de
 *    altura fixa para o preço não pular quando a chave vira;
 *  - o plano atual (mesmo código E mesmo ciclo) não é escolhível de novo.
 */
export function GradeDePlanos({
  planos,
  planoAtual,
  cicloAtual,
}: {
  planos: Plano[];
  planoAtual: string | null;
  cicloAtual: CicloDeCobranca | null;
}) {
  const [ciclo, setCiclo] = useState<CicloDeCobranca>("annual");

  const maiorDesconto = Math.max(
    0,
    ...planos.map((plano) => descontoAnualPercent(plano) ?? 0),
  );

  return (
    <>
      <div className="chave-de-ciclo" role="tablist" aria-label="Ciclo de cobrança">
        <button
          type="button"
          role="tab"
          aria-selected={ciclo === "monthly"}
          className={ciclo === "monthly" ? "ativa" : ""}
          onClick={() => setCiclo("monthly")}
        >
          Mensal
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={ciclo === "annual"}
          className={ciclo === "annual" ? "ativa" : ""}
          onClick={() => setCiclo("annual")}
        >
          Anual{maiorDesconto > 0 ? ` (-${maiorDesconto}%)` : ""}
        </button>
      </div>

      <p className="aviso-de-cobranca">
        {ciclo === "annual"
          ? "Valores por mês, cobrados anualmente"
          : "Valores por mês, cobrados mensalmente"}
      </p>

      {planos.map((plano) => {
        const preco =
          ciclo === "annual"
            ? (precoMensalDoAnual(plano) ?? formataPreco(plano.monthlyPriceCents))
            : formataPreco(plano.monthlyPriceCents);
        const esteEhOAtual =
          plano.code === planoAtual && ciclo === (cicloAtual ?? "");
        const porAdvogado = rotuloPorAdvogado(plano);

        return (
          <div className="cartao" key={plano.code}>
            <div className="linha-topo">
              <strong>{plano.name}</strong>
              {esteEhOAtual && <span className="selo dourado">Seu plano</span>}
            </div>
            <p className="preco" style={{ margin: "8px 0 0" }}>
              {preco}
              <span className="sufixo"> por mês</span>
            </p>
            <p className="detalhe">
              {rotuloDaEquipe(plano)}
              {porAdvogado !== null ? ` · ${porAdvogado}` : ""}
            </p>
            <form action={escolherPlano}>
              <input type="hidden" name="plano" value={plano.code} />
              <input type="hidden" name="ciclo" value={ciclo} />
              <button type="submit" disabled={esteEhOAtual}>
                {esteEhOAtual
                  ? "Plano atual"
                  : planoAtual === null
                    ? "Começar teste grátis de 30 dias"
                    : "Mudar para este plano"}
              </button>
            </form>
          </div>
        );
      })}
    </>
  );
}
