import { existsSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  atalhosDaAjuda,
  secoesDeAjuda,
  textoDaAjuda,
  type PerguntaDeAjuda,
} from "./ajuda";

const todasAsPerguntas: PerguntaDeAjuda[] = secoesDeAjuda.flatMap(
  (secao) => secao.perguntas,
);

/**
 * A tela existe MESMO? Resolve o atalho para o arquivo de rota do Next, do
 * jeito que o roteador resolve: `/advogado/agenda` é
 * `src/app/advogado/agenda/page.tsx`. É a diferença entre "o link parece
 * certo" e "o link abre".
 */
function telaExiste(href: string): boolean {
  const rota = href.split(/[?#]/)[0].replace(/\/+$/, "");
  return existsSync(`src/app${rota}/page.tsx`);
}

describe("central de ajuda", () => {
  it("nenhuma pergunta fica sem resposta", () => {
    // O defeito clássico da ajuda: o título entra no plano, o parágrafo
    // fica para depois, e a pessoa abre um acordeão vazio, que é pior do
    // que não ter a pergunta.
    const mudas = todasAsPerguntas.filter(
      (item) =>
        item.pergunta.trim() === "" ||
        item.resposta.length === 0 ||
        item.resposta.some((paragrafo) => paragrafo.trim() === ""),
    );

    expect(mudas.map((item) => item.pergunta)).toEqual([]);
  });

  it("toda seção tem pelo menos uma pergunta", () => {
    const vazias = secoesDeAjuda.filter((secao) => secao.perguntas.length === 0);
    expect(vazias.map((secao) => secao.titulo)).toEqual([]);
  });

  it("nenhuma pergunta é repetida", () => {
    // Duas vezes a mesma pergunta com respostas diferentes é o começo de
    // uma delas ficar desatualizada em silêncio.
    const vistas = todasAsPerguntas.map((item) => item.pergunta);
    expect(vistas).toEqual([...new Set(vistas)]);
  });

  it("todo atalho aponta para uma tela que existe", () => {
    // A BARREIRA PRINCIPAL. Link morto é reprovado nesta casa, e a ajuda é
    // onde ele nasce: ninguém percebe que uma rota mudou de nome até
    // alguém clicar aqui e cair no 404.
    const mortos = atalhosDaAjuda().filter((atalho) => !telaExiste(atalho.href));

    expect(mortos.map((atalho) => atalho.href)).toEqual([]);
  });

  it("nenhum atalho depende do escritório aberto", () => {
    // A ajuda vale para o advogado E para o escritório, e não tem id na
    // rota. `/escritorio/{id}/equipe` daqui só poderia ser chutado, e quem
    // trabalha em duas bancas não tem "o" escritório: essas telas são
    // citadas pelo nome que está na barra lateral.
    const comId = atalhosDaAjuda().filter(
      (atalho) =>
        atalho.href.includes("[") || atalho.href.startsWith("/escritorio"),
    );

    expect(comId.map((atalho) => atalho.href)).toEqual([]);
  });

  it("a ajuda não aponta para fora do webapp", () => {
    // Endereço externo o teste não consegue conferir (não há rede aqui), e
    // ajuda com link para fora é exatamente onde o link apodrece sem
    // ninguém ver. Privacidade e Termos já estão no rodapé de toda página,
    // que é uma fonte só para manter.
    const foraDaCasa = atalhosDaAjuda().filter(
      (atalho) => !atalho.href.startsWith("/"),
    );

    expect(foraDaCasa.map((atalho) => atalho.href)).toEqual([]);
  });

  it("não publica canal de atendimento nem prazo que ninguém garante", () => {
    // BARREIRA DE REDAÇÃO, e a razão é concreta:
    //
    //  - não existe canal de atendimento aberto, e o endereço que os
    //    outros repositórios publicam não recebe mensagem (o domínio não
    //    tem MX). Escrever "fale com o suporte" aqui seria mandar a pessoa
    //    escrever para o vazio, que é um link morto disfarçado de texto;
    //  - "em breve" é promessa sem data e está proibido na casa;
    //  - prazo em número de dias úteis não está garantido em lugar nenhum
    //    do código; o que a tela de verificação diz, e o que a ajuda
    //    repete, é "alguns dias úteis".
    //
    // Quando existir caixa de verdade, é aqui que a mudança se registra.
    const proibidos: [RegExp, string][] = [
      [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/, "endereço de e-mail"],
      [/suporte/i, "canal de suporte"],
      [/em breve/i, "promessa sem data"],
      [/\d+\s*dias?\s*[úu]teis/i, "prazo em dias úteis"],
    ];

    const infracoes = textoDaAjuda().flatMap((trecho) =>
      proibidos
        .filter(([padrao]) => padrao.test(trecho))
        .map(([, motivo]) => `${motivo}: ${trecho}`),
    );

    expect(infracoes).toEqual([]);
  });
});
