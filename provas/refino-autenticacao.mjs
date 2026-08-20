/**
 * Refino das telas de autenticacao (webapp).
 *
 * COMO RODAR: build contra o Supabase LOCAL (.env.production.local), serve em
 * 3123, e:  node provas/refino-autenticacao.mjs
 *
 * Prova a copy nova do login, que o cadastro fica CENTRADO (nao preso a
 * esquerda), que ambos preservam fundo/logo/card, que nao ha scroll
 * horizontal no mobile, e que o fluxo login -> criar conta -> cadastrar
 * continua funcionando (signup real, limpo no fim).
 */
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
const APP = "http://localhost:3123";
const DB = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const sql = (q) => execFileSync("psql", [DB, "-q", "-t", "-A", "-c", q], { encoding: "utf8" }).trim();
let falhas = 0;
const ok = (n, c, d = "") => { console.log(`${c ? "ok  " : "FALHA"} ${n}${d ? " | " + d : ""}`); if (!c) falhas++; };
const EMAIL_NOVO = "cadastro.refino@gmail.com";

const b = await chromium.launch();
try {
  // ---- LOGIN: copy ----
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto(`${APP}/entrar`, { waitUntil: "networkidle" });
  const txt = await p.locator("body").innerText();

  ok("1. headline preservada", txt.includes("O dia inteiro do escritório") && txt.includes("numa tela só."));
  ok("2. bullet ajustado (e quem faz o quê)", txt.includes("A carteira de casos e quem faz o quê"));
  ok("   bullet antigo sumiu (com quem)", !txt.includes("casos com quem faz"));
  ok("3. subtitulo do card novo", txt.includes("Tudo do seu escritório, conectado ao aplicativo."));
  ok("   subtitulo antigo sumiu", !txt.includes("A mesa de trabalho do seu escritório, com a mesma conta"));
  ok("4. selo de seguranca novo", txt.includes("Acesso seguro e integrado ao aplicativo."));
  ok("   selo antigo sumiu", !txt.includes("protegida do início ao fim"));
  ok("   selo continua com icone (svg de cadeado)", (await p.locator(".selo-da-entrada svg").count()) === 1);
  ok("5. login continua com dois lados (palco + cartao)", (await p.locator(".palco-da-entrada").count()) === 1);
  ok("   CTA Criar conta intacto", (await p.locator('a:has-text("Criar conta"), button:has-text("Criar conta")').count()) >= 1);

  // ---- CADASTRO: centralizacao ----
  await p.locator('a:has-text("Criar conta")').first().click();
  await p.waitForURL((u) => u.pathname.includes("/criar-conta"), { timeout: 10000 });
  await p.waitForTimeout(300);

  const card = await p.locator(".cartao-de-entrada").boundingBox();
  const vw = 1440;
  const centroCard = card.x + card.width / 2;
  const desvio = Math.abs(centroCard - vw / 2);
  ok("6. cartao de cadastro CENTRADO na viewport", desvio < 24, `centro=${Math.round(centroCard)} viewport/2=${vw / 2} desvio=${Math.round(desvio)}px`);
  ok("   largura do card entre 400 e 500px", card.width >= 400 && card.width <= 500, `largura=${Math.round(card.width)}px`);
  ok("   nao encosta na borda esquerda", card.x > 40, `x=${Math.round(card.x)}px`);
  ok("   nao sobra metade direita vazia (fim do card passa do meio)", card.x + card.width > vw / 2, `fim=${Math.round(card.x + card.width)}px`);

  const ct = await p.locator("body").innerText();
  ok("7. texto e campos do cadastro presentes",
    ct.includes("depois que a Jurii verifica") &&
    (await p.locator('input').count()) >= 5 &&
    (await p.locator('button:has-text("Criar conta")').count()) >= 1 &&
    ct.includes("Já tem conta?"));
  ok("   fundo e logo preservados", (await p.locator(".tela-de-entrada").count()) === 1 && (await p.locator(".lockup-da-entrada").count()) >= 1);
  await p.close();

  // ---- MOBILE: sem scroll horizontal, card quase cheio ----
  const m = await b.newPage({ viewport: { width: 390, height: 844 } });
  await m.goto(`${APP}/criar-conta`, { waitUntil: "networkidle" });
  await m.waitForTimeout(200);
  const semScrollX = await m.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  ok("8. mobile sem scroll horizontal", semScrollX);
  const cardM = await m.locator(".cartao-de-entrada").boundingBox();
  ok("   card ocupa quase toda a largura com margem", cardM.x >= 12 && cardM.x <= 28, `margem=${Math.round(cardM.x)}px`);
  await m.close();

  // ---- FLUXO: signup real continua funcionando ----
  sql(`delete from auth.users where email='${EMAIL_NOVO}';`);
  const f = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await f.goto(`${APP}/criar-conta`, { waitUntil: "networkidle" });
  const inputs = f.locator(".cartao-de-entrada input");
  await inputs.nth(0).fill("Ana Refino Teste");
  await inputs.nth(1).fill(EMAIL_NOVO);
  await inputs.nth(2).fill("529.982.247-25"); // CPF valido
  await inputs.nth(3).fill("SenhaForte!2026");
  await inputs.nth(4).fill("SenhaForte!2026");
  await f.locator('button:has-text("Criar conta")').first().click();
  await f.waitForTimeout(3000);
  const criado = sql(`select count(*) from auth.users where email='${EMAIL_NOVO}';`);
  ok("9. o fluxo de cadastro continua criando a conta", criado === "1", `contas criadas=${criado}`);
  sql(`delete from auth.users where email='${EMAIL_NOVO}';`);
  await f.close();
} finally {
  await b.close();
  sql(`delete from auth.users where email='${EMAIL_NOVO}';`);
}
process.exit(falhas === 0 ? 0 : 1);
