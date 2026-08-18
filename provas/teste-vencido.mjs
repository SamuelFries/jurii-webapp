/**
 * A jornada de quem deixou o teste grátis vencer.
 *
 * A pergunta que ela responde: o acesso é bloqueado E existe caminho claro
 * para assinar, sem a pessoa ficar presa numa tela de "acesso negado"?
 *
 * Cada passo é o que a pessoa realmente faz: entra, tenta abrir escritório,
 * lê o que a tela oferece, vai para assinatura, e paga.
 */
import { chromium } from "playwright";

const APP = "http://localhost:3123";
let falhas = 0;
const confere = (nome, ok, d = "") => {
  console.log(`${ok ? "ok  " : "FALHA"} ${nome}${d ? ` | ${d}` : ""}`);
  if (!ok) falhas++;
};

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });

await p.goto(`${APP}/entrar`);
await p.fill("#email", "vencido@jurii.local");
await p.fill("#senha", "testevencido123");
await p.click('button[type="submit"]');
await p.waitForURL((u) => !u.pathname.startsWith("/entrar"), { timeout: 15000 });
confere("entra normalmente: teste vencido NAO bloqueia o login", true, p.url());

// 1. O ACESSO E BLOQUEADO onde deve ser: abrir escritorio.
await p.goto(`${APP}/abrir-escritorio`, { waitUntil: "networkidle" });
const corpo = (await p.textContent("body")) ?? "";
confere("o formulario de abrir escritorio NAO aparece",
  !corpo.includes("CNPJ") || corpo.includes("acabou"), "");
confere("e a tela diz que o TESTE ACABOU, sem prometer 30 dias de novo",
  corpo.includes("Seu teste grátis acabou") && !corpo.includes("30 dias"), "");
await p.screenshot({ path: "/tmp/vencido-abrir.png" });

// 2. O CAMINHO E CLARO: um botao que leva a pagar.
const botao = p.locator("a", { hasText: "Ativar cobrança" });
confere("existe um botao de ativar cobranca", (await botao.count()) > 0, "");
await botao.first().click();
await p.waitForURL(/\/assinatura/, { timeout: 15000 });
confere("e ele leva para assinatura, nao para uma tela morta", true, p.url());

// 3. A ASSINATURA diz a verdade e oferece pagar.
await p.waitForLoadState("networkidle");
const ass = (await p.textContent("body")) ?? "";
confere("a assinatura mostra 'teste encerrado'", ass.includes("teste encerrado"), "");
const pagar = p.locator("button", { hasText: /Ativar cobrança|Regularizar/ });
confere("com o botao de pagar disponivel", (await pagar.count()) > 0, "");
await p.screenshot({ path: "/tmp/vencido-assinatura.png" });

// 4. PAGAR FUNCIONA de verdade: leva a pagina do provedor.
await Promise.all([
  p.waitForURL(/sandbox\.asaas\.com/, { timeout: 40000 }),
  pagar.first().click(),
]);
confere("pagar leva a uma pagina de pagamento REAL", /sandbox\.asaas\.com\/i\//.test(p.url()), p.url());

await b.close();
console.log(falhas === 0 ? "\nTUDO VERDE" : `\n${falhas} FALHAS`);
process.exit(falhas === 0 ? 0 : 1);
