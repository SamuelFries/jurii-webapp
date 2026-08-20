/**
 * O badge de nao lidas some quando eu abro a conversa, sem eu recarregar.
 *
 * COMO RODAR: sobe o build contra o Supabase LOCAL (mesmo cuidado dos outros:
 * .env.production.local com a URL local, apagado depois), serve em 3123:
 *
 *   node provas/badge-nao-lidas.mjs
 *
 * Semeia tudo (banca, socia, cliente, conversa e 3 mensagens do cliente por
 * ler) e limpa no fim. O que prova: a lista mostra "3", eu clico na conversa,
 * e o "3" some SOZINHO, sem navegar de novo. Antes do fix (router.refresh no
 * chat.tsx) ele ficava ate a proxima navegacao.
 */
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
const APP = "http://localhost:3123";
const DB = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const sql = (q) => execFileSync("psql", [DB, "-q", "-t", "-A", "-c", q], { encoding: "utf8" }).trim();
let falhas = 0;
const confere = (n, ok, d = "") => { console.log(`${ok ? "ok  " : "FALHA"} ${n}${d ? " | " + d : ""}`); if (!ok) falhas++; };

const API = "http://127.0.0.1:54321";
const K = "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";
const F = "eb000001-0000-4000-8000-000000000001";
const CLI = "eb00c001-0000-4000-8000-000000000001";
const CONV = "eb00d001-0000-4000-8000-000000000001";
const SENHA = "provadebadge12345";
const EMAIL = "socia.badge@gmail.com"; // gmail: passa pelo filtro de descartaveis

function limpa() {
  sql(`delete from public.messages where conversation_id='${CONV}';`);
  sql(`delete from public.conversations where id='${CONV}';`);
  sql(`delete from public.law_firm_members where law_firm_id='${F}';`);
  sql(`delete from public.law_firms where id='${F}';`);
  sql(`delete from auth.users where email in ('${EMAIL}','cliente.badge@gmail.com');`);
}

// A socia nasce pela API de signup, para a senha ser aceita pelo GoTrue
// (bcrypt via pgcrypto nao passa na verificacao dele). Depois viramos ela
// dona da banca por SQL.
async function signup(email) {
  const r = await fetch(`${API}/auth/v1/signup`, {
    method: "POST",
    headers: { apikey: K, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: SENHA, data: { full_name: "Socia Badge" } }),
  });
  const j = await r.json();
  if (!j.user?.id) throw new Error("signup falhou: " + JSON.stringify(j));
  return j.user.id;
}

limpa();
const SOCIA = await signup(EMAIL);
// O cliente nao loga; basta existir como usuario para o FK e o perfil.
sql(`insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
     values ('${CLI}','authenticated','authenticated','cliente.badge@gmail.com','', now(), '{}', '{"full_name":"Cliente Badge"}', now(), now());`);
sql(`insert into public.law_firms (id, name, initials, specialty, is_active, cep, oab_state)
     values ('${F}','Banca Badge','BB','Direito Cível', true, '90540140', 'RS');`);
sql(`insert into public.law_firm_members (law_firm_id, profile_id, roles, member_role, role, status)
     values ('${F}','${SOCIA}', array['owner'], 'owner', 'owner', 'active');`);
sql(`insert into public.conversations (id, type, law_firm_id, client_id, title)
     values ('${CONV}','client_firm','${F}','${CLI}','Atendimento Badge');`);
sql(`insert into public.messages (conversation_id, sender_id, sender_type, body)
     values ('${CONV}','${CLI}','client','oi 1'), ('${CONV}','${CLI}','client','oi 2'), ('${CONV}','${CLI}','client','oi 3');`);

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
try {
  await p.goto(`${APP}/entrar`);
  await p.fill("#email", EMAIL);
  await p.fill("#senha", SENHA);
  await p.click('button[type="submit"]');
  await p.waitForURL((u) => !u.pathname.startsWith("/entrar"), { timeout: 15000 });

  await p.goto(`${APP}/escritorio/${F}/mensagens`, { waitUntil: "networkidle" });
  await p.waitForTimeout(400);

  const pilula = p.locator(".pilula-nao-lidas");
  const antes = (await pilula.count()) > 0 ? (await pilula.first().textContent())?.trim() : "(nenhuma)";
  confere("1. a lista mostra o badge com 3", antes === "3", `badge=${antes}`);

  // Abre a conversa clicando no item da lista, como um humano.
  await p.locator("a.cartao-de-lista:has-text(\"Cliente Badge\")").first().click();
  await p.waitForURL((u) => u.pathname.includes(`/conversas/${CONV}`), { timeout: 15000 });

  // A prova de verdade é o BANCO: `void supabase.rpc(...)` sem .then nunca
  // envia (builder preguiçoso), então o bug deixava as mensagens não lidas
  // para sempre. Espera o efeito assentar (a chamada é assíncrona) e confere.
  let lidasNoBanco = "?";
  for (let i = 0; i < 32; i++) {
    lidasNoBanco = sql(`select count(*) from public.messages where conversation_id='${CONV}' and sender_id='${CLI}' and read_at is null;`);
    if (lidasNoBanco === "0") break;
    await p.waitForTimeout(250);
  }
  confere("2. o banco confirma leitura ao abrir (a chamada foi enviada)", lidasNoBanco === "0", `nao lidas no banco=${lidasNoBanco}`);

  // E o tique de ENTREGUE (a outra chamada preguiçosa do mesmo efeito).
  let entreguesNoBanco = "?";
  for (let i = 0; i < 20; i++) {
    entreguesNoBanco = sql(`select count(*) from public.messages where conversation_id='${CONV}' and sender_id='${CLI}' and delivered_at is null;`);
    if (entreguesNoBanco === "0") break;
    await p.waitForTimeout(250);
  }
  confere("3. o tique de entregue tambem acende (mesma armadilha)", entreguesNoBanco === "0", `nao entregues=${entreguesNoBanco}`);

  // Com o banco já em 0, a lista revalidada não mostra mais o badge, sem eu
  // ter recarregado a página nem navegado de novo.
  await p.waitForTimeout(600);
  const semBadge = (await p.locator(".pilula-nao-lidas").count()) === 0;
  confere("4. e o badge sumiu da lista, sem recarregar", semBadge);
} finally {
  await b.close();
  limpa();
}
process.exit(falhas === 0 ? 0 : 1);
