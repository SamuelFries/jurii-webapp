/**
 * Prova de layout no Chromium de verdade, sem depender de print do Samuel.
 *
 * Monta uma página-fixture com o MARKUP da casca e das grades (o mesmo das
 * páginas) e o globals.css real, e mede:
 *
 *  1. as duas grades (advogados e escritórios) têm a MESMA largura;
 *  2. nenhuma grade estoura o main (o defeito do print: o endereço longo,
 *     em nowrap, empurrava o trilho `1fr` além do contêiner, porque `1fr`
 *     tem piso de min-content, e a grade dos escritórios ficava mais larga
 *     que a dos advogados);
 *  3. cabeçalho e conteúdo dividem a mesma régua, centralizada;
 *  4. o texto longo termina em reticências, não corta seco.
 *
 * Roda com: npm run test:layout
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const raiz = dirname(dirname(fileURLToPath(import.meta.url)));
const css = readFileSync(join(raiz, "src/app/globals.css"), "utf8");

const enderecoLongo =
  "Rua Germano Petersen Júnior, 70 - 1102, Auxiliadora, Porto Alegre - RS, CEP 90540-140";

const fixture = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><style>${css}</style></head>
<body>
  <header class="cabecalho"><div class="cabecalho-interno">
    <div class="linha-topo">
      <a href="#" class="marca marca-pequena">jurii<span class="ouro">.</span></a>
      <div class="acoes-do-topo"><button class="discreto">Sair</button></div>
    </div>
    <nav class="abas"><a class="ativa" href="#">Início</a><a href="#">Conversas</a></nav>
  </div></header>
  <main class="pagina pagina-larga">
    <h2 class="secao">Advogados recomendados</h2>
    <div class="grade-dupla" id="advogados">
      <div class="cartao-de-lista"><span class="avatar">AB</span>
        <span class="conteudo"><span class="titulo">André Kabke Bainy</span>
        <p class="linha-2">Direito Administrativo</p></span></div>
      <div class="cartao-de-lista"><span class="avatar">PN</span>
        <span class="conteudo"><span class="titulo">Patrícia Helena Nunes</span>
        <p class="linha-2">Direito Cível</p></span></div>
    </div>
    <h2 class="secao">Conversas</h2>
    <div class="lista-empilhada" id="conversas">
      <div class="cartao-de-lista"><span class="avatar">PF</span>
        <span class="conteudo"><span class="titulo">Pedro Fernando Fries</span>
        <p class="linha-2">Solicitação de aceite do caso: Caso o zé</p></span></div>
      <div class="cartao-de-lista" id="cartao-longo"><span class="avatar">F</span>
        <span class="conteudo"><span class="titulo">Fábio Costa</span>
        <p class="linha-2" id="triagem">Triagem da assistente Jurii Resumo do caso: Cliente relata: "oi baterm". Categoria provável: Não identificada. Triagem manual recomendada. Urgência: Baixa: Relato ainda sem detalhes suficientes para classificar</p></span></div>
    </div>
    <h2 class="secao">Escritórios recomendados</h2>
    <div class="grade-dupla" id="escritorios">
      <div class="cartao-de-lista"><span class="avatar">SA</span>
        <span class="conteudo"><span class="titulo">Sangiogo Advogados Associados</span>
        <p class="linha-2">Direito do Consumidor</p>
        <p class="linha-2" id="endereco">${enderecoLongo}</p></span></div>
      <div class="cartao-de-lista"><span class="avatar">H</span>
        <span class="conteudo"><span class="titulo">Herzer &amp; Santos</span>
        <p class="linha-2">${enderecoLongo}</p></span></div>
    </div>
  </main>
</body></html>`;

const navegador = await chromium.launch();
const falhas = [];

for (const largura of [1280, 1728, 2402]) {
  const pagina = await navegador.newPage({
    viewport: { width: largura, height: 1000 },
  });
  await pagina.setContent(fixture);

  const medidasDaLista = await pagina.evaluate(() => {
    const lista = document.getElementById("conversas").getBoundingClientRect();
    const cartaoLongo = document
      .getElementById("cartao-longo")
      .getBoundingClientRect();
    const cartaoCurto = document
      .querySelector("#conversas .cartao-de-lista")
      .getBoundingClientRect();
    const triagem = document.getElementById("triagem");
    return {
      cartaoLongo: cartaoLongo.width,
      cartaoCurto: cartaoCurto.width,
      lista: lista.width,
      triagemTruncada: triagem.scrollWidth > triagem.clientWidth,
    };
  });

  if (Math.abs(medidasDaLista.cartaoLongo - medidasDaLista.cartaoCurto) > 1) {
    falhas.push(
      `@${largura}: o cartão com triagem longa (${medidasDaLista.cartaoLongo.toFixed(0)}) ficou mais largo que o irmão (${medidasDaLista.cartaoCurto.toFixed(0)})`,
    );
  }
  if (medidasDaLista.cartaoLongo > medidasDaLista.lista + 1) {
    falhas.push(`@${largura}: cartão estourando a lista empilhada`);
  }
  if (!medidasDaLista.triagemTruncada) {
    falhas.push(`@${largura}: a prévia da triagem não truncou em reticências`);
  }

  const medidas = await pagina.evaluate(() => {
    const advogados = document.getElementById("advogados").getBoundingClientRect();
    const escritorios = document.getElementById("escritorios").getBoundingClientRect();
    const principal = document.querySelector("main").getBoundingClientRect();
    const cabecalho = document
      .querySelector(".cabecalho-interno")
      .getBoundingClientRect();
    const endereco = document.getElementById("endereco");
    return {
      advogados: { largura: advogados.width, esquerda: advogados.left },
      escritorios: { largura: escritorios.width, esquerda: escritorios.left },
      principal: { largura: principal.width, esquerda: principal.left },
      cabecalho: { largura: cabecalho.width, esquerda: cabecalho.left },
      janela: window.innerWidth,
      enderecoTruncado: endereco.scrollWidth > endereco.clientWidth,
    };
  });

  const iguais =
    Math.abs(medidas.advogados.largura - medidas.escritorios.largura) < 1 &&
    Math.abs(medidas.advogados.esquerda - medidas.escritorios.esquerda) < 1;
  if (!iguais) {
    falhas.push(
      `@${largura}: grades DESALINHADAS: advogados ${medidas.advogados.largura.toFixed(0)}px, escritórios ${medidas.escritorios.largura.toFixed(0)}px`,
    );
  }

  if (medidas.escritorios.largura > medidas.principal.largura + 1) {
    falhas.push(
      `@${largura}: a grade dos escritórios ESTOURA o main (${medidas.escritorios.largura.toFixed(0)} > ${medidas.principal.largura.toFixed(0)})`,
    );
  }

  const margemEsquerda = medidas.principal.esquerda;
  const margemDireita = medidas.janela - margemEsquerda - medidas.principal.largura;
  if (Math.abs(margemEsquerda - margemDireita) > 2) {
    falhas.push(
      `@${largura}: main descentralizado (esq ${margemEsquerda.toFixed(0)}, dir ${margemDireita.toFixed(0)})`,
    );
  }

  if (Math.abs(medidas.cabecalho.largura - medidas.principal.largura) > 1) {
    falhas.push(
      `@${largura}: cabeçalho (${medidas.cabecalho.largura.toFixed(0)}) e conteúdo (${medidas.principal.largura.toFixed(0)}) em réguas diferentes`,
    );
  }

  if (!medidas.enderecoTruncado) {
    falhas.push(
      `@${largura}: endereço longo não truncou em reticências (a linha empurrou a largura)`,
    );
  }

  console.log(
    `@${largura}px: main ${medidas.principal.largura.toFixed(0)} | advogados ${medidas.advogados.largura.toFixed(0)} | escritórios ${medidas.escritorios.largura.toFixed(0)} | margens ${medidas.principal.esquerda.toFixed(0)}/${(medidas.janela - medidas.principal.esquerda - medidas.principal.largura).toFixed(0)}`,
  );
  await pagina.close();
}

await navegador.close();

if (falhas.length > 0) {
  console.error("\nFALHOU:\n" + falhas.map((f) => `  - ${f}`).join("\n"));
  process.exit(1);
}
console.log("\nLayout aprovado nas três larguras.");
