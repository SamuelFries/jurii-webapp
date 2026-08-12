/**
 * Prova de layout no Chromium de verdade, sem depender de print do Samuel.
 *
 * Monta uma página-fixture com o MARKUP das páginas e o globals.css real.
 *
 * ENCOLHEU com o recorte profissional: as grades duplas e a casca do
 * cliente (cabeçalho com abas, `.pagina-larga`) sumiram junto com as telas
 * de cliente, e testar CSS que nenhuma página renderiza é teste que só
 * pode dar falso verde. Ficou o que a mesa de trabalho usa de verdade:
 *
 *  1. cartão de lista com texto longo NÃO fica mais largo que o irmão (o
 *     defeito do `1fr` com piso de min-content, que a prévia da triagem em
 *     nowrap escancarava);
 *  2. o texto longo termina em reticências, não corta seco;
 *  3. a área de trabalho: lateral de 248, lista de 380, principal cravado
 *     na direita e caixa de envio no fundo, sem rolagem de página.
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
  <main class="pagina-de-trabalho"><div class="miolo">
    <h2 class="secao">Conversas</h2>
    <div class="lista-empilhada" id="conversas">
      <div class="cartao-de-lista"><span class="avatar">PF</span>
        <span class="conteudo"><span class="titulo">Pedro Fernando Fries</span>
        <p class="linha-2">Solicitação de aceite do caso: Caso o zé</p></span></div>
      <div class="cartao-de-lista" id="cartao-longo"><span class="avatar">F</span>
        <span class="conteudo"><span class="titulo">Fábio Costa</span>
        <p class="linha-2" id="triagem">Triagem da assistente Jurii Resumo do caso: Cliente relata: "oi baterm". Categoria provável: Não identificada. Triagem manual recomendada. Urgência: Baixa: Relato ainda sem detalhes suficientes para classificar</p></span></div>
    </div>
    <h2 class="secao">Casos</h2>
    <div class="lista-empilhada" id="casos">
      <div class="cartao-de-lista"><span class="avatar">SA</span>
        <span class="conteudo"><span class="titulo">Sangiogo Advogados Associados</span>
        <p class="linha-2" id="endereco">${enderecoLongo}</p></span></div>
    </div>
  </div></main>
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
    const casos = document.getElementById("casos").getBoundingClientRect();
    const principal = document.querySelector("main").getBoundingClientRect();
    return {
      casos: { largura: casos.width, esquerda: casos.left },
      principal: { largura: principal.width, esquerda: principal.left },
      janela: window.innerWidth,
    };
  });

  if (medidas.casos.largura > medidas.principal.largura + 1) {
    falhas.push(
      `@${largura}: a lista ESTOURA o main (${medidas.casos.largura.toFixed(0)} > ${medidas.principal.largura.toFixed(0)})`,
    );
  }

  const margemEsquerda = medidas.principal.esquerda;
  const margemDireita = medidas.janela - margemEsquerda - medidas.principal.largura;
  if (Math.abs(margemEsquerda - margemDireita) > 2) {
    falhas.push(
      `@${largura}: main descentralizado (esq ${margemEsquerda.toFixed(0)}, dir ${margemDireita.toFixed(0)})`,
    );
  }

  // A truncagem é medida na prévia da triagem (acima), que é longa o
  // bastante para estourar QUALQUER largura. O endereço, que fazia esse
  // papel quando vivia numa célula estreita de grade, hoje cabe no miolo
  // largo: manter a asserção nele seria exigir reticências onde não há o
  // que truncar.

  console.log(
    `@${largura}px: main ${medidas.principal.largura.toFixed(0)} | lista ${medidas.casos.largura.toFixed(0)} | margens ${medidas.principal.esquerda.toFixed(0)}/${(medidas.janela - medidas.principal.esquerda - medidas.principal.largura).toFixed(0)}`,
  );
  await pagina.close();
}

/* ---- Fixture 2: a área de trabalho (fluxos profissionais) ----
   Sidebar fixa + mestre-detalhe. O que não pode acontecer: rolagem
   horizontal, painéis fora da régua, e a caixa de envio do chat fugindo
   da tela quando a conversa é longa. */

const muitasMensagens = Array.from({ length: 40 }, (_, i) =>
  `<div class="bolha ${i % 2 ? "minha" : "deles"}">Mensagem número ${i} com um texto de tamanho razoável para empurrar a rolagem.</div>`,
).join("");

const fixtureTrabalho = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><style>${css}</style></head>
<body>
  <div class="area-de-trabalho">
    <aside class="lateral" id="lateral">
      <a href="#" class="marca marca-pequena">jurii<span class="ouro">.</span></a>
      <nav>
        <a class="ativa" href="#">Mensagens</a>
        <a href="#">Casos</a>
        <a href="#">Notificações <span class="pilula-nao-lidas">3</span></a>
      </nav>
      <div class="rodape-da-lateral"><nav><a href="#">Conta</a></nav></div>
    </aside>
    <div class="conteudo-de-trabalho">
      <div class="painel-dividido">
        <aside class="painel-lista" id="lista">
          <h1>Mensagens</h1>
          <div class="lista-empilhada">
            <a class="cartao-de-lista ativa" href="#"><span class="avatar">AS</span>
              <span class="conteudo"><span class="titulo">Ana Souza</span>
              <p class="linha-2">Triagem da assistente Jurii Resumo do caso: Cliente relata um texto bem longo que precisa truncar</p></span></a>
            <a class="cartao-de-lista" href="#"><span class="avatar">BL</span>
              <span class="conteudo"><span class="titulo">Bruno Lima</span>
              <p class="linha-2">ok</p></span></a>
          </div>
        </aside>
        <section class="painel-principal" id="principal">
          <div class="cabecalho-do-chat"><a href="#">← Conversas</a>
            <span class="nome">Ana Souza</span></div>
          <div class="chat" id="chat">${muitasMensagens}</div>
          <div class="caixa-de-envio" id="caixa">
            <textarea rows="2"></textarea><button>Enviar</button>
          </div>
        </section>
      </div>
    </div>
  </div>
</body></html>`;

for (const largura of [1280, 1728, 2402]) {
  const pagina = await navegador.newPage({
    viewport: { width: largura, height: 900 },
  });
  await pagina.setContent(fixtureTrabalho);

  const medidas = await pagina.evaluate(() => {
    const lateral = document.getElementById("lateral").getBoundingClientRect();
    const lista = document.getElementById("lista").getBoundingClientRect();
    const principal = document
      .getElementById("principal")
      .getBoundingClientRect();
    const caixa = document.getElementById("caixa").getBoundingClientRect();
    const chat = document.getElementById("chat");
    return {
      janela: window.innerWidth,
      alturaDaJanela: window.innerHeight,
      lateral: lateral.width,
      lista: lista.width,
      principalDireita: principal.right,
      caixaFundo: caixa.bottom,
      chatRola: chat.scrollHeight > chat.clientHeight,
      rolagemHorizontal:
        document.documentElement.scrollWidth > window.innerWidth + 1,
      rolagemVertical:
        document.documentElement.scrollHeight > window.innerHeight + 1,
    };
  });

  console.log(
    `trabalho @${largura}: lateral ${medidas.lateral.toFixed(0)} | lista ${medidas.lista.toFixed(0)} | direita do principal ${medidas.principalDireita.toFixed(0)}/${medidas.janela} | caixa no fundo ${medidas.caixaFundo.toFixed(0)}/${medidas.alturaDaJanela}`,
  );

  if (medidas.rolagemHorizontal) {
    falhas.push(`trabalho @${largura}: rolagem horizontal na área de trabalho`);
  }
  if (medidas.rolagemVertical) {
    falhas.push(
      `trabalho @${largura}: a PÁGINA rola em vez de os painéis rolarem`,
    );
  }
  if (Math.abs(medidas.lateral - 248) > 1) {
    falhas.push(`trabalho @${largura}: lateral fora da régua de 248`);
  }
  if (Math.abs(medidas.lista - 380) > 1) {
    falhas.push(`trabalho @${largura}: painel de lista fora da régua de 380`);
  }
  if (medidas.principalDireita < medidas.janela - 1) {
    falhas.push(
      `trabalho @${largura}: o painel principal NÃO usa a tela inteira (sobra à direita)`,
    );
  }
  if (!medidas.chatRola) {
    falhas.push(
      `trabalho @${largura}: o chat não rola por conta própria (a fixture tem 40 mensagens)`,
    );
  }
  if (medidas.caixaFundo > medidas.alturaDaJanela + 1) {
    falhas.push(
      `trabalho @${largura}: a caixa de envio fugiu da tela com conversa longa`,
    );
  }
  await pagina.close();
}

await navegador.close();

if (falhas.length > 0) {
  console.error("\nFALHOU:\n" + falhas.map((f) => `  - ${f}`).join("\n"));
  process.exit(1);
}
console.log("\nLayout aprovado nas três larguras.");
