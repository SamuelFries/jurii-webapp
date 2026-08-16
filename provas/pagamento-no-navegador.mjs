/**
 * A prova de navegador do fluxo de pagamento.
 *
 * POR QUE ELA EXISTE: a orquestração em src/app/pagamento/acoes.ts é server
 * action, então não tem teste de unidade, e é ela que decide quem ganhou a
 * corrida do compare-and-set e quem apaga a duplicata. As peças do provedor
 * foram medidas contra o sandbox e a função do banco tem pgTAP; o meio de
 * campo que junta as duas, não tinha nada.
 *
 * NÃO RODA EM CI de propósito: precisa do Supabase local de pé e da API do
 * Asaas respondendo, e teste que depende de provedor de terceiro estar no ar
 * é teste que falha por motivo errado.
 *
 * COMO RODAR
 *
 *   1. supabase start && supabase db reset
 *   2. Crie a conta e o cenário (o script diz o que falta se não achar).
 *   3. Suba o app com o Supabase LOCAL. Atenção: `next build` embute
 *      NEXT_PUBLIC_* no pacote, então tem que buildar com a URL local, e o
 *      @next/env deixa o .env.local VENCER de variáveis inline. Use um
 *      .env.production.local (que ganha do .env.local) e apague depois.
 *
 *      E escape o cifrão da chave do Asaas dentro de qualquer arquivo .env:
 *      sem a barra, o dotenv expande `$aact_...` como variável indefinida e
 *      a chave vira string vazia, em silêncio.
 *
 *   4. ASAAS_API_KEY=<sandbox> node provas/pagamento-no-navegador.mjs
 *
 * O QUE ELA PROVA, e cada linha aqui já falhou de verdade em algum momento:
 * que o servidor fala com o banco local e não com produção; que clicar em
 * pagar abre uma página de pagamento que existe; que o id do provedor é
 * gravado; que o SEGUNDO clique não cria a segunda mensalidade; e que a
 * assinatura só vira ativa depois de o dinheiro entrar.
 */
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";

const APP = "http://localhost:3123";
const DB = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const CHAVE = process.env.ASAAS_API_KEY;
if (!CHAVE || !CHAVE.startsWith("$aact_hmlg_")) {
  console.error(
    "ASAAS_API_KEY precisa ser a chave de SANDBOX ($aact_hmlg_...).\n" +
      "Esta prova cria cobrança de verdade: com a chave de produção ela\n" +
      "cobraria gente de verdade, então ela se recusa a rodar sem sandbox.",
  );
  process.exit(1);
}
const ASSINATURA = "bb000000-0000-4000-8000-00000000000b";

const sql = (q) =>
  execFileSync("psql", [DB, "-tAc", q], { encoding: "utf8" }).trim();

// Devolve o corpo, mas NÃO engole o status: uma prova que não vê o erro da
// API culpa o código errado. Foi o que aconteceu aqui na primeira rodada.
const asaas = async (caminho, metodo = "GET", corpo) => {
  const r = await fetch(`https://api-sandbox.asaas.com/v3${caminho}`, {
    method: metodo,
    headers: { access_token: CHAVE, "Content-Type": "application/json" },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  const b = await r.json();
  if (!r.ok) {
    console.log(`   API ${metodo} ${caminho} -> ${r.status}: ${JSON.stringify(b).slice(0, 200)}`);
  }
  return b;
};

let falhas = 0;
const confere = (nome, ok, detalhe = "") => {
  console.log(`${ok ? "ok  " : "FALHA"} ${nome}${detalhe ? ` | ${detalhe}` : ""}`);
  if (!ok) falhas++;
};

// ESTADO LIMPO. Sem isto a prova mede o resto da rodada anterior: a
// assinatura já ativa no provedor e o id já gravado fariam os dois cliques
// passarem sem nunca exercitar a criação.
sql(`update public.law_firm_license_subscriptions
     set status='trialing', provider_subscription_id=null,
         trial_ends_at=now() + interval '15 days'
     where id = '${ASSINATURA}'`);
for (const velha of (await asaas(`/subscriptions?externalReference=${ASSINATURA}`)).data ?? []) {
  if (velha.status === "ACTIVE") await asaas(`/subscriptions/${velha.id}`, "DELETE");
}

const navegador = await chromium.launch();
const pagina = await navegador.newPage();

// ---------------------------------------------------------------------------
// 0. O SERVIDOR FALA COM O BANCO LOCAL?
// ---------------------------------------------------------------------------
// A pergunta vem ANTES de qualquer clique que escreva. O .env.local do repo
// aponta para produção, e uma prova de pagamento rodando contra produção
// criaria linha de cobrança de verdade. Esta conta só existe no banco local:
// se o login passa, é o local que está respondendo.
await pagina.goto(`${APP}/entrar`);
await pagina.fill("#email", "prova@jurii.local");
await pagina.fill("#senha", "provadepagamento123");
await pagina.click('button[type="submit"]');
await pagina.waitForURL((u) => !u.pathname.startsWith("/entrar"), {
  timeout: 15000,
});
confere(
  "o servidor esta falando com o Supabase LOCAL, e nao com producao",
  true,
  "login de conta que so existe no local passou",
);

// ---------------------------------------------------------------------------
// 1. O PRIMEIRO CLIQUE
// ---------------------------------------------------------------------------
await pagina.goto(`${APP}/assinatura`);
const rotulo = await pagina.textContent(".selo");
confere("a tela mostra o plano contratado", /Essencial/.test(rotulo ?? ""), rotulo?.trim());

// Pelo TEXTO, e não por 'form button': a casca da página tem outros
// formulários (sair, por exemplo), e o primeiro do DOM não é o de pagar.
await Promise.all([
  pagina.waitForURL(/sandbox\.asaas\.com/, { timeout: 30000 }),
  pagina.getByRole("button", { name: /Ativar cobran/i }).click(),
]);
const primeiraUrl = pagina.url();
confere("clicar em pagar leva a uma pagina de pagamento de verdade", /sandbox\.asaas\.com\/i\//.test(primeiraUrl), primeiraUrl);

const idGravado = sql(
  `select coalesce(provider_subscription_id,'(vazio)') from public.law_firm_license_subscriptions where id = '${ASSINATURA}'`,
);
confere(
  "e o id do provedor foi GRAVADO no banco pelo compare-and-set",
  /^sub_/.test(idGravado),
  idGravado,
);

const depoisDoPrimeiro = await asaas(`/subscriptions?externalReference=${ASSINATURA}`);
confere(
  "uma assinatura no provedor",
  depoisDoPrimeiro.data?.filter((s) => s.status === "ACTIVE").length === 1,
  `${depoisDoPrimeiro.data?.length} no total`,
);

// ---------------------------------------------------------------------------
// 2. O SEGUNDO CLIQUE, que era onde nascia a mensalidade duplicada
// ---------------------------------------------------------------------------
await pagina.goto(`${APP}/assinatura`);
await Promise.all([
  pagina.waitForURL(/sandbox\.asaas\.com/, { timeout: 30000 }),
  pagina.getByRole("button", { name: /Ativar cobran/i }).click(),
]);
confere("o segundo clique leva a MESMA pagina de pagamento", pagina.url() === primeiraUrl, pagina.url());

const depoisDoSegundo = await asaas(`/subscriptions?externalReference=${ASSINATURA}`);
const ativas = depoisDoSegundo.data?.filter((s) => s.status === "ACTIVE") ?? [];
confere(
  "e CONTINUA sendo uma assinatura recorrente, nao duas",
  ativas.length === 1,
  ativas.map((s) => `${s.id} ${s.value}`).join(", "),
);

// ---------------------------------------------------------------------------
// 3. O WEBHOOK FECHA O CICLO
// ---------------------------------------------------------------------------
// Confirmar a cobrança à mão no sandbox é o que o Asaas faz quando o dinheiro
// entra de verdade.
const cobrancas = await asaas(`/subscriptions/${ativas[0].id}/payments`);
const cobranca = cobrancas.data[0];

// A DATA DA BAIXA É A BRASILEIRA, e não a UTC. Medido: a API recusa com "A
// data selecionada 16/08/2026 não pode ser posterior a data atual" quando o
// UTC já virou e o Brasil não. É o espelho da restrição do nextDueDate, e a
// razão de o produto poder usar UTC lá e não poder aqui.
const hojeNoBrasil = new Date(Date.now() - 3 * 3600 * 1000)
  .toISOString()
  .slice(0, 10);

const baixa = await asaas(`/payments/${cobranca.id}/receiveInCash`, "POST", {
  paymentDate: hojeNoBrasil,
  value: cobranca.value,
  notifyCustomer: false,
});
console.log(`   baixa manual respondeu status=${baixa.status ?? "(sem status)"}`);

// A BAIXA É CONFERIDA, e não suposta. Engoli-la fez esta prova culpar o
// webhook por uma cobrança que nunca chegou a ser paga: o webhook estava
// certo em ignorar, e quem estava errado era o cenário.
//
// E é conferida COM ESPERA. Medido: o POST de baixa devolve 200 na hora, mas
// a consulta logo em seguida ainda responde PENDING por alguns segundos. Isso
// é do provedor, não nosso, e em produção o webhook só chega depois que o
// Asaas assentou. Aqui a prova é que precisa esperar o mundo real.
let paga;
for (let tentativa = 0; tentativa < 15; tentativa++) {
  paga = await asaas(`/payments/${cobranca.id}`);
  if (["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"].includes(paga.status)) break;
  await new Promise((r) => setTimeout(r, 1000));
}
confere(
  "a cobranca consta como PAGA no provedor antes de o webhook ser chamado",
  ["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"].includes(paga.status),
  paga.status,
);

const antes = sql(
  `select status from public.law_firm_license_subscriptions where id = '${ASSINATURA}'`,
);

const resposta = await fetch(`${APP}/api/webhooks/pagamento`, {
  method: "POST",
  headers: {
    "asaas-access-token": "token-de-prova-local-com-mais-de-32-caracteres",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ event: "PAYMENT_RECEIVED", payment: { id: cobranca.id } }),
});
const corpo = await resposta.json();
confere("o webhook aceita a chamada", resposta.status === 200, JSON.stringify(corpo));

const depois = sql(
  `select status from public.law_firm_license_subscriptions where id = '${ASSINATURA}'`,
);
confere(
  "e a assinatura vira ATIVA so depois do dinheiro entrar",
  antes === "trialing" && depois === "active",
  `${antes} -> ${depois}`,
);

// E o token errado continua sendo recusado, sem virar 500.
const forjada = await fetch(`${APP}/api/webhooks/pagamento`, {
  method: "POST",
  headers: { "asaas-access-token": "chute", "Content-Type": "application/json" },
  body: JSON.stringify({ event: "PAYMENT_RECEIVED", payment: { id: cobranca.id } }),
});
confere("chamada com token errado e recusada com 401", forjada.status === 401, `http ${forjada.status}`);

await navegador.close();
console.log(falhas === 0 ? "\nTUDO VERDE" : `\n${falhas} FALHAS`);
process.exit(falhas === 0 ? 0 : 1);
