import { chromium } from "playwright";
/**
 * A prova de navegador do convite por link, de ponta a ponta.
 *
 * O ciclo que ela percorre é o da vida real: a gestora gera o link na tela
 * de Equipe, manda para alguém SEM conta aberta, a pessoa vê quem chamou e
 * para quê ANTES de logar, entra, CAI DE VOLTA no convite (o ?depois= do
 * login), aceita, e vira membro. E o mesmo link, na mão de uma segunda
 * pessoa, diz "já foi usado".
 *
 * Foi ela que pegou o middleware: /convite não estava nas rotas públicas e
 * a página nem abria para quem mais importa — quem ainda não tem conta.
 *
 * COMO RODAR
 *   1. supabase start && supabase db reset
 *   2. Suba o build com o Supabase LOCAL (ver provas do pagamento: cuidado
 *      com o cifrão do dotenv e o .env.production.local).
 *   3. node provas/convite-por-link.mjs
 *
 * Ela cria e APAGA os próprios usuários (sufixo @convite.local) e a banca
 * cf300000-...: rodar duas vezes não acumula nada.
 */
import { execFileSync } from "node:child_process";

const APP = "http://localhost:3123";
const DB = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const API = "http://127.0.0.1:54321";
const SR = "sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz";
const FIRMA = "cf300000-0000-4000-8000-000000000003";

const sql = (q) => execFileSync("psql", [DB, "-q", "-c", q], { encoding: "utf8" });
const limpa = () =>
  sql(`delete from auth.users where email like '%@convite.local';
       delete from public.law_firms where id = '${FIRMA}';`);

async function criaUsuario(email, nome) {
  const r = await fetch(`${API}/auth/v1/admin/users`, {
    method: "POST",
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "provadeconvite123", email_confirm: true, user_metadata: { full_name: nome } }),
  });
  return (await r.json()).id;
}

limpa();
const GEST = await criaUsuario("gestora@convite.local", "Gestora Prova");
await criaUsuario("secretaria@convite.local", "Secretaria Prova");
const ADMIN = await criaUsuario("admin2@convite.local", "Admin Segundo");
sql(`insert into public.law_firms (id, name, initials, specialty, is_active, cep, oab_state)
     values ('${FIRMA}','Banca da Prova','BP','Direito Cível',true,'90540140','RS');
     insert into public.law_firm_members (law_firm_id, profile_id, roles, member_role, role, status)
     values ('${FIRMA}','${GEST}',array['owner'],'owner'::public.law_firm_member_role,'owner','active'),
            ('${FIRMA}','${ADMIN}',array['admin'],'admin'::public.law_firm_member_role,'admin','active');`);
process.on("exit", limpa);
let falhas = 0;
const confere = (nome, ok, detalhe = "") => {
  console.log(`${ok ? "ok  " : "FALHA"} ${nome}${detalhe ? ` | ${detalhe}` : ""}`);
  if (!ok) falhas++;
};

const b = await chromium.launch();

// A GESTORA gera o link.
const gestora = await b.newPage({ viewport: { width: 1280, height: 900 } });
await gestora.goto(`${APP}/entrar`);
await gestora.fill("#email", "gestora@convite.local");
await gestora.fill("#senha", "provadeconvite123");
await gestora.click('button[type="submit"]');
await gestora.waitForURL((u) => !u.pathname.startsWith("/entrar"), { timeout: 15000 });
await gestora.goto(`${APP}/escritorio/cf300000-0000-4000-8000-000000000003/equipe`);

await gestora.locator("summary", { hasText: "Convidar por link" }).click();
await gestora.locator('select[name="papel"]').selectOption("secretary");
await gestora.locator("button", { hasText: "Gerar link" }).click();
await gestora.waitForURL(/link=/, { timeout: 15000 });

const url = await gestora.locator(".copiar-link input").inputValue();
confere("o link gerado aparece UMA vez, completo", /\/convite\/[0-9a-f]{48}$/.test(url), url);
await gestora.screenshot({ path: "/tmp/convite-gerado.png" });

// Lista de abertos mostra 1 com o papel certo. O details volta FECHADO
// depois do redirect (pagina nova), entao abre antes de ler.
await gestora.locator("summary", { hasText: "Convidar por link" }).click();
const aberto = await gestora.locator(".linha-de-link-aberto").innerText();
confere("a lista de abertos mostra papel, autor e vencimento", /Secretária · por Gestora Prova · vence/.test(aberto.replace(/\s+/g, " ")), aberto.trim());

// A SECRETÁRIA abre o link DESLOGADA.
const sec = await b.newPage({ viewport: { width: 900, height: 900 } });
await sec.goto(url.replace(/^https?:\/\/[^/]+/, APP));
const corpo = (await sec.textContent("body")) ?? "";
confere("deslogada, a pagina diz quem chamou e para que", corpo.includes("Banca da Prova") && corpo.includes("Secretária"), "");
await sec.screenshot({ path: "/tmp/convite-deslogada.png" });

// Entra pelo botão e VOLTA para o convite.
await sec.locator("a", { hasText: "Entrar para pedir" }).click();
await sec.waitForURL(/\/entrar\?depois=/, { timeout: 15000 });
await sec.fill("#email", "secretaria@convite.local");
await sec.fill("#senha", "provadeconvite123");
await sec.click('button[type="submit"]');
await sec.waitForURL(/\/convite\//, { timeout: 15000 });
confere("depois de entrar, ela CAI DE VOLTA no convite", true, sec.url());

// PEDE (nao entra). O link autoriza o papel; a identidade quem confirma e
// quem administra.
await sec.locator("button", { hasText: "Pedir para entrar" }).click();
await sec.waitForSelector("text=Pedido enviado", { timeout: 15000 });
confere("clicar PEDE, e a pessoa fica esperando", true, "tela de espera");

const membrosAntes = Number(
  sql(`select count(*) from public.law_firm_members where law_firm_id='${FIRMA}';`)
    .split("\n")[2].trim(),
);
confere("e NINGUEM virou membro pelo clique", membrosAntes, 2);

// Reabrir o link NAO diz "ja usado" para quem pediu.
await sec.reload();
const esperando = (await sec.textContent("body")) ?? "";
confere("reabrir o link mostra a espera, nao 'ja usado'",
  esperando.includes("Pedido enviado") && !esperando.includes("já foi usado"), "");

// A GESTORA ve o pedido na Equipe, com nome e sinal de CPF.
await gestora.goto(`${APP}/escritorio/${FIRMA}/equipe`, { waitUntil: "networkidle" });
const cartao = await gestora.locator(".pedido-de-entrada").innerText();
confere("a Equipe mostra quem pediu, com o sinal de CPF",
  /Secretaria Prova/.test(cartao) && /CPF/.test(cartao), cartao.replace(/\s+/g, " ").slice(0, 90));
await gestora.screenshot({ path: "/tmp/pedido-na-equipe.png" });

// Aprova.
await gestora.locator("button", { hasText: "Aprovar" }).click();
await gestora.waitForURL(/entrada-aprovada/, { timeout: 15000 });
const depois = Number(
  sql(`select count(*) from public.law_firm_members where law_firm_id='${FIRMA}';`)
    .split("\n")[2].trim(),
);
confere("aprovar coloca a pessoa na equipe", depois, 3);

// E quem pediu ve a aprovacao ao voltar ao link.
await sec.reload();
confere("quem pediu ve que entrou",
  ((await sec.textContent("body")) ?? "").includes("Você entrou na equipe"), "");

// SEGUNDO USO: outra sessão anônima com o mesmo link.
const intruso = await b.newPage();
await intruso.goto(url.replace(/^https?:\/\/[^/]+/, APP));
const corpoIntruso = (await intruso.textContent("body")) ?? "";
confere("o mesmo link para OUTRA pessoa diz 'ja foi usado'", corpoIntruso.includes("já foi usado"), "");
await intruso.screenshot({ path: "/tmp/convite-usado.png" });

// E a gestora recebeu o aviso no banco.
await b.close();
console.log(falhas === 0 ? "\nTUDO VERDE" : `\n${falhas} FALHAS`);
process.exit(falhas === 0 ? 0 : 1);
