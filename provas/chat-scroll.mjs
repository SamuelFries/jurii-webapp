/**
 * COMO RODAR: sobe o build contra o Supabase LOCAL (ver provas/pagamento-no-
 * navegador.mjs para o cuidado com .env.production.local e o cifrão), semeia
 * uma conversa com mais de 50 mensagens na banca ee000001-... e passa o id do
 * cliente em CLI_ID:
 *
 *   CLI_ID=<uuid do cliente> node provas/chat-scroll.mjs
 *
 * A CSP local libera ws:// para o realtime (next.config.ts): sem isso a
 * mensagem "nova" nunca chega e o cenario 3 passa por acidente.
 */
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
const APP="http://localhost:3123", F="ee000001-0000-4000-8000-000000000001", C="ee00c001-0000-4000-8000-000000000001";
const DB="postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const CLI=process.env.CLI_ID ?? "";
const sql=(q)=>execFileSync("psql",[DB,"-q","-c",q],{encoding:"utf8"});
let falhas=0; const confere=(n,ok,d="")=>{console.log(`${ok?"ok  ":"FALHA"} ${n}${d?" | "+d:""}`); if(!ok) falhas++;};

const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1440,height:900}});
await p.goto(`${APP}/entrar`); await p.fill("#email","socia@ux.local"); await p.fill("#senha","provadeux12345");
await p.click('button[type="submit"]'); await p.waitForURL(u=>!u.pathname.startsWith("/entrar"),{timeout:15000});
await p.goto(`${APP}/escritorio/${F}/conversas/${C}`,{waitUntil:"networkidle"}); await p.waitForTimeout(500);

const medir=()=>p.evaluate(()=>{const l=document.querySelector(".chat"); return {top:l.scrollTop,h:l.scrollHeight,c:l.clientHeight,doFim:l.scrollHeight-l.scrollTop-l.clientHeight};});
const bolhas=()=>p.locator(".chat .bolha").count();

// 1
let m=await medir(); confere("1. abre no fim", m.doFim<5, `distancia do fim=${Math.round(m.doFim)}px`);
const antesN=await bolhas(); confere("   primeira pagina tem 50", antesN===50, `bolhas=${antesN}`);

// 2
await p.evaluate(()=>{document.querySelector(".chat").scrollTop=600;}); await p.waitForTimeout(150);
m=await medir(); confere("2. subiu para ler e ficou la", Math.abs(m.top-600)<5, `top=${Math.round(m.top)}`);

// 3 e 4: chega mensagem nova do cliente via banco (realtime entrega).
const topAntes=(await medir()).top;
sql(`insert into public.messages (conversation_id, sender_id, sender_type, body) values ('${C}','${CLI}','client','Chegou enquanto voce lia la em cima');`);
await p.waitForTimeout(1200);
m=await medir(); confere("3. mensagem nova NAO me jogou para o fim", Math.abs(m.top-topAntes)<5, `top antes=${Math.round(topAntes)} depois=${Math.round(m.top)}`);
const botao=p.locator(".voltar-ao-fim"); confere("4. botao 'novas · ir para o fim' apareceu", (await botao.count())===1, (await botao.count()) ? await botao.innerText() : "(sem botao)");

// 5: no TOPO da lista (scrollTop 0), a pagina anterior entra por cima e a
// bolha que estava no alto da tela continua exatamente onde estava.
// A regua e uma bolha VISIVEL (a primeira da pagina atual, que esta no
// topo da viewport quando scrollTop=0), nao um indice arbitrario.
await p.evaluate(()=>{document.querySelector(".chat").scrollTop=0;}); await p.waitForTimeout(100);
const primeira=p.locator(".chat .bolha").first();
const txtRegua=(await primeira.innerText()).split("\n")[0].slice(0,32);
const boxAntes=await primeira.boundingBox();
await p.waitForTimeout(1500);
const depoisN=await bolhas();
confere("5a. carregou pagina anterior ao chegar no topo", depoisN>antesN, `bolhas ${antesN} -> ${depoisN}`);
const boxDepois=await p.locator(".chat .bolha",{hasText:txtRegua}).first().boundingBox();
confere("5b. a mensagem que eu lia continua na MESMA altura da tela", boxAntes && boxDepois && Math.abs(boxAntes.y-boxDepois.y)<8, `y antes=${Math.round(boxAntes?.y??-1)} depois=${Math.round(boxDepois?.y??-1)}`);

// 6: botao volta ao fim.
await botao.click(); await p.waitForTimeout(1500);
m=await medir(); confere("6. clicar no botao vai ao fim e ele some", m.doFim<5 && (await botao.count())===0, `distancia do fim=${Math.round(m.doFim)}`);

// 7: sobe de novo, envia, vai ao fim.
await p.evaluate(()=>{document.querySelector(".chat").scrollTop=300;}); await p.waitForTimeout(150);
await p.fill(".caixa-de-envio textarea","Respondendo do meio do historico"); await p.keyboard.press("Enter"); await p.waitForTimeout(1200);
m=await medir(); const ultima=await p.locator(".chat .bolha").last().innerText();
confere("7. enviar do meio leva ao fim, com a minha por ultimo", m.doFim<5 && ultima.includes("Respondendo"), `distancia do fim=${Math.round(m.doFim)}`);

// Bonus: a faixa de estado sumiu porque a equipe falou por ultimo.
confere("   faixa 'cliente aguarda' some depois que a equipe responde", (await p.locator(".faixa-de-estado").count())===0, "");

await b.close(); console.log(falhas===0?"\nTUDO VERDE":`\n${falhas} FALHAS`); process.exit(falhas===0?0:1);
