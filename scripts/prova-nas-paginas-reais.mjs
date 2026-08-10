/**
 * Mede o layout nas PÁGINAS REAIS, logado de verdade: sobe contra o build
 * de produção local, entra pelo formulário como uma pessoa, e mede
 * /conversas e /inicio. A fixture (prova-de-layout.mjs) valida o CSS puro;
 * esta aqui pega o que só aparece com a árvore real de componentes.
 *
 * Requer CONTA_EMAIL e CONTA_SENHA no ambiente (conta de teste descartável).
 * Roda com: npm run test:layout:real
 */
import { chromium } from "playwright";

const base = process.env.BASE_URL ?? "http://localhost:3987";
const email = process.env.CONTA_EMAIL;
const senha = process.env.CONTA_SENHA;
if (!email || !senha) {
  console.error("Defina CONTA_EMAIL e CONTA_SENHA.");
  process.exit(2);
}

const navegador = await chromium.launch();
const falhas = [];

for (const largura of [1280, 2311]) {
  const pagina = await navegador.newPage({
    viewport: { width: largura, height: 1100 },
  });

  await pagina.goto(`${base}/entrar`);
  await pagina.fill("#email", email);
  await pagina.fill("#senha", senha);
  await pagina.click("button[type=submit]");
  await pagina.waitForURL(/inicio|advogado|escritorio/, { timeout: 20000 });

  for (const rota of ["/conversas", "/inicio"]) {
    await pagina.goto(`${base}${rota}`);
    await pagina.waitForSelector("main.pagina");

    const medidas = await pagina.evaluate(() => {
      const principal = document.querySelector("main").getBoundingClientRect();
      const cabecalho = document
        .querySelector(".cabecalho-interno")
        .getBoundingClientRect();
      const cartoes = [...document.querySelectorAll(".cartao-de-lista")].map(
        (cartao) => cartao.getBoundingClientRect().width,
      );
      return {
        janela: window.innerWidth,
        principal: { largura: principal.width, esquerda: principal.left },
        cabecalho: { largura: cabecalho.width, esquerda: cabecalho.left },
        cartaoMaisLargo: cartoes.length ? Math.max(...cartoes) : 0,
        rolagemHorizontal:
          document.documentElement.scrollWidth > window.innerWidth + 1,
      };
    });

    const margemEsquerda = medidas.principal.esquerda;
    const margemDireita =
      medidas.janela - margemEsquerda - medidas.principal.largura;

    console.log(
      `${rota} @${largura}: main ${medidas.principal.largura.toFixed(0)} (margens ${margemEsquerda.toFixed(0)}/${margemDireita.toFixed(0)}) | cabeçalho ${medidas.cabecalho.largura.toFixed(0)} | cartão mais largo ${medidas.cartaoMaisLargo.toFixed(0)} | rolagem horizontal: ${medidas.rolagemHorizontal}`,
    );

    if (Math.abs(margemEsquerda - margemDireita) > 2) {
      falhas.push(`${rota} @${largura}: main descentralizado`);
    }
    if (medidas.principal.largura > 881) {
      falhas.push(`${rota} @${largura}: main acima da régua de 880`);
    }
    if (medidas.cartaoMaisLargo > medidas.principal.largura - 39) {
      falhas.push(
        `${rota} @${largura}: cartão (${medidas.cartaoMaisLargo.toFixed(0)}) estourando o main`,
      );
    }
    if (medidas.rolagemHorizontal) {
      falhas.push(`${rota} @${largura}: página com rolagem horizontal`);
    }
    if (Math.abs(medidas.cabecalho.largura - medidas.principal.largura) > 1) {
      falhas.push(`${rota} @${largura}: cabeçalho fora da régua do conteúdo`);
    }
  }
  await pagina.close();
}

await navegador.close();

if (falhas.length > 0) {
  console.error("\nFALHOU:\n" + falhas.map((f) => `  - ${f}`).join("\n"));
  process.exit(1);
}
console.log("\nPáginas reais aprovadas.");
