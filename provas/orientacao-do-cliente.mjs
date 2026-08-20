/**
 * A tela de orientacao (/cliente): quem entra no webapp sem papel
 * profissional. Prova a copy nova, a hierarquia (titulo > explicacao >
 * cliente > advogado > acoes discretas), que os links/fluxos seguem
 * intactos, e a responsividade.
 *
 * COMO RODAR: build contra o Supabase LOCAL, servido em 3123, e
 *   node provas/orientacao-do-cliente.mjs
 * Semeia um usuario SEM papel profissional (cliente puro) e limpa no fim.
 */
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
const APP = "http://localhost:3123";
const DB = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const API = "http://127.0.0.1:54321";
const K = "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";
const sql = (q) => execFileSync("psql", [DB, "-q", "-t", "-A", "-c", q], { encoding: "utf8" }).trim();
let falhas = 0;
const ok = (n, c, d = "") => { console.log(`${c ? "ok  " : "FALHA"} ${n}${d ? " | " + d : ""}`); if (!c) falhas++; };

const EMAIL = "cliente.orientacao@gmail.com";
const SENHA = "provaorienta12345";
const limpa = () => sql(`delete from auth.users where email='${EMAIL}';`);

limpa();
const r = await fetch(`${API}/auth/v1/signup`, {
  method: "POST", headers: { apikey: K, "Content-Type": "application/json" },
  body: JSON.stringify({ email: EMAIL, password: SENHA, data: { full_name: "Cliente Orientacao" } }),
});
const j = await r.json();
if (!j.user?.id) throw new Error("signup falhou: " + JSON.stringify(j));

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
try {
  const p = await ctx.newPage();
  await p.goto(`${APP}/entrar`);
  await p.fill("#email", EMAIL); await p.fill("#senha", SENHA);
  await p.click('button[type="submit"]');
  await p.waitForURL((u) => !u.pathname.startsWith("/entrar"), { timeout: 15000 });

  // Cliente puro chega em /cliente sozinho: a raiz roteia pelo fluxo da
  // pessoa (o roteamento nao foi tocado). Segue o redirect antes de medir.
  await p.goto(`${APP}/`, { waitUntil: "networkidle" });
  await p.waitForTimeout(300);
  ok("1. cliente sem papel profissional e roteado para /cliente", p.url().includes("/cliente"), p.url().replace(APP, ""));
  const t = await p.locator("body").innerText();

  ok("2. titulo novo", t.includes("Este espaço é para advogados e escritórios"));
  ok("   titulo antigo sumiu", !t.includes("Sua área da Jurii é no aplicativo"));
  ok("3. explicacao dos dois ambientes", t.includes("O Jurii tem um ambiente para cada lado da relação") && t.includes("exclusiva para advogados e equipes"));

  ok("4. area do cliente", t.includes("Não é advogado?") && t.includes("Encontre profissionais, converse com escritórios"));
  ok("5. area do advogado", t.includes("É advogado ou advogada?") && t.includes("Verifique sua OAB para liberar a mesa de trabalho"));

  // Tom: nada de bloqueio/punicao.
  const negativas = ["não tem permissão", "Acesso negado", "não pode acessar", "Conta bloqueada", "bloqueado"];
  const achadas = negativas.filter((n) => t.toLowerCase().includes(n.toLowerCase()));
  ok("6. sem linguagem de bloqueio", achadas.length === 0, achadas.join(", ") || "nenhuma");

  // Hierarquia: o titulo e o maior texto da tela.
  const tamTitulo = await p.locator("h1").evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
  const tamStrong = await p.locator(".bloco strong").first().evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
  ok("7. titulo e o elemento mais forte", tamTitulo >= 28 && tamTitulo > tamStrong, `h1=${tamTitulo}px strong=${tamStrong}px`);

  // Ordem visual de cima para baixo.
  const y = async (sel) => (await p.locator(sel).first().boundingBox()).y;
  const yTitulo = await y("h1");
  const yExplic = await y(".orientacao > .subtitulo");
  const yCliente = await y(".bloco:has-text('Não é advogado?')");
  const yAdv = await y(".bloco:has-text('É advogado ou advogada?')");
  const yAcoes = await y(".acoes-discretas");
  ok("8. ordem: titulo > explicacao > cliente > advogado > acoes",
    yTitulo < yExplic && yExplic < yCliente && yCliente < yAdv && yAdv < yAcoes,
    `${Math.round(yTitulo)}<${Math.round(yExplic)}<${Math.round(yCliente)}<${Math.round(yAdv)}<${Math.round(yAcoes)}`);

  // Acao principal e o botao cheio do cliente; a da OAB e secundaria; conta/sair sem peso de botao.
  const clienteEhPrimario = await p.locator('.bloco a.botao[href="https://jurii.com.br"]').count();
  const oabEhSecundario = await p.locator('.bloco a.botao.secundario[href="/verificacao"]').count();
  ok("9. 'Ir para jurii.com.br' e a acao principal", clienteEhPrimario === 1);
  ok("   'Verificar minha OAB' e secundaria, com o link intacto", oabEhSecundario === 1);
  ok("10. Minha conta e Sair existem, discretos (fora de .botao)",
    (await p.locator('.acoes-discretas a[href="/conta"]').count()) === 1 &&
    (await p.locator('.acoes-discretas button.discreto').count()) === 1 &&
    (await p.locator('.acoes-discretas .botao').count()) === 0);

  // Rodape institucional global.
  ok("11. rodape institucional presente", t.includes("CNPJ e contato em") && t.includes("Privacidade") && t.includes("Termos"));

  // O fluxo da OAB continua chegando na verificacao.
  await p.locator('a.botao[href="/verificacao"]').first().click();
  await p.waitForURL((u) => u.pathname.includes("/verificacao"), { timeout: 10000 });
  ok("12. o fluxo de verificacao da OAB continua funcionando", p.url().includes("/verificacao"));
  await p.close();

  // Responsividade.
  for (const [nome, w, h] of [["tablet", 820, 1180], ["mobile", 390, 844]]) {
    // Mesmo contexto: a sessao viaja junto, senao /cliente manda para /entrar.
    const m = await ctx.newPage();
    await m.setViewportSize({ width: w, height: h });
    await m.goto(`${APP}/cliente`, { waitUntil: "networkidle" });
    await m.waitForTimeout(250);
    const semScrollX = await m.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
    ok(`13. ${nome}: sem scroll horizontal`, semScrollX);
    const card = await m.locator(".orientacao").boundingBox();
    ok(`    ${nome}: card com margem confortavel`, card.x >= 12, `margem=${Math.round(card.x)}px`);
    if (nome === "mobile") {
      const alturaBotao = (await m.locator('.bloco a.botao').first().boundingBox()).height;
      ok("    mobile: area de toque do botao >= 40px", alturaBotao >= 40, `${Math.round(alturaBotao)}px`);
    }
    await m.close();
  }
} finally {
  await b.close();
  limpa();
}
process.exit(falhas === 0 ? 0 : 1);
