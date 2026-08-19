/**
 * A matriz de validacao do detalhe do caso: cada linha e uma condicao que
 * o plano prometeu, medida no navegador (texto presente/ausente, botoes
 * visiveis, links certos), nao por print. E o fluxo de ida e volta.
 *
 * COMO RODAR: build contra o Supabase LOCAL, cenario com a banca ee000001
 * e os casos ee00ca01 (cheio, com responsavel Rafael, conversa, docs, CNJ),
 * ee00ca02 (sem responsavel, sem conversa, sem docs, sem CNJ, sem historico)
 * e ee00ca03 (encerrado). Contas *@ux.local, senha provadeux12345.
 */
import { chromium } from "playwright";
const APP="http://localhost:3123", F="ee000001-0000-4000-8000-000000000001";
const CA1="ee00ca01-0000-4000-8000-000000000001", CA2="ee00ca02-0000-4000-8000-000000000002", CA3="ee00ca03-0000-4000-8000-000000000003";
const C1="ee00c001-0000-4000-8000-000000000001";
let falhas=0; const confere=(n,ok,d="")=>{console.log(`${ok?"ok  ":"FALHA"} ${n}${d?" | "+d:""}`); if(!ok) falhas++;};
const b=await chromium.launch();
async function entra(email,opts={}){ const p=await b.newPage({viewport:{width:1440,height:900},...opts}); await p.goto(`${APP}/entrar`); await p.fill("#email",email); await p.fill("#senha","provadeux12345"); await p.click('button[type="submit"]'); await p.waitForURL(u=>!u.pathname.startsWith("/entrar"),{timeout:15000}); return p; }
// Le o painel inteiro: quem nao tem acesso ve o painel-vazio, sem .detalhe-do-caso.
const texto=async(p)=>((await p.textContent(".painel-principal"))??"").replace(/\s+/g," ");
const tem=async(p,sel)=>(await p.locator(sel).count())>0;

// ---- SOCIA no caso cheio ----
let p=await entra("socia@ux.local");
await p.goto(`${APP}/escritorio/${F}/casos/${CA1}`,{waitUntil:"networkidle"}); await p.screenshot({path:"/tmp/caso-depois/socia-1440.png"});
let t=await texto(p);
confere("A. cliente em destaque, area, status, titulo em 2a linha", /Joao Pereira.*Direito Trabalhista.*Em andamento.*Rescisao indireta/.test(t), "");
// O titulo do caso ("Rescisao indireta - Joao Pereira") vem assim do app; o
// que a tela nao pode fazer e repetir o cliente FORA do titulo (o antigo
// "titulo · Joao Pereira · area"). Conta so fora da .linha-2.
const cab=(await p.locator(".cabecalho-do-caso .linha-1").innerText()).replace(/\s+/g," ");
confere("A. cliente aparece uma vez na linha principal, e nao e repetido no subtitulo", (cab.match(/Joao Pereira/g)||[]).length===1 && !/Joao Pereira.*Joao Pereira/.test(cab), cab);
confere("A. 'Responsavel: Rafael' aparece", /Responsável: Rafael/.test(t), "");
confere("A. 'Abrir conversa' aparece (caso COM conversa)", await tem(p,`a[href='/escritorio/${F}/conversas/${C1}']`), "");
confere("B. faixa 'Cliente aguarda resposta' (cliente falou por ultimo)", /Cliente aguarda resposta há/.test(t), "");
confere("C. linha do tempo UNICA com origem Tribunal e Equipe · Rafael", /Tribunal/.test(t) && /Equipe · Rafael/.test(t), "");
confere("C. tribunal antes de equipe quando mais recente (Audiencia primeiro)", t.indexOf("Audiência")<t.indexOf("Peticao inicial"), "");
confere("D. documentos listados com tamanho e quem subiu", /Procuracao assinada.*117 KB.*por Rafael/.test(t) && /Holerites.*por Joao/.test(t), "");
confere("D. documento abre em nova aba por URL assinada", (await p.locator(".lista-de-documentos a.documento[target='_blank']").count())===2, "");
confere("E. 'Registrar atualizacao' e a primaria e o form so abre ao pedir", await tem(p,".acao-primaria > summary") && !(await tem(p,".acao-primaria[open]")), "");
confere("E. menu ··· com Atribuir e Encerrar (socia gerencia)", await tem(p,".cabecalho-do-caso .moderacao"), "");
confere("E. CNJ preenchido = dado + Editar, sem input pendente", /0001234-70\.2026\.5\.04\.0001/.test(t) && await tem(p,".editar-inline > summary:has-text('Editar')") && !(await tem(p,".editar-inline[open]")) && !(await tem(p,".linha-de-dado input:visible")), "");
await p.locator(".cabecalho-do-caso .moderacao > summary").click(); await p.waitForTimeout(150);
confere("E. encerrar exige confirmacao curta (Encerrar… → Confirmar)", await tem(p,".confirmar-encerrar > summary") && !(await tem(p,"button:has-text('Confirmar encerramento'):visible")), "");
await p.locator(".confirmar-encerrar > summary").click(); await p.waitForTimeout(100);
confere("   ...e o Confirmar aparece so depois", await tem(p,"button:has-text('Confirmar encerramento')"), "");
await p.screenshot({path:"/tmp/caso-depois/socia-menu.png"});
await p.close();

// ---- SOCIA no caso 2 (sem responsavel, sem conversa, sem docs, sem CNJ, sem historico) ----
p=await entra("socia@ux.local");
await p.goto(`${APP}/escritorio/${F}/casos/${CA2}`,{waitUntil:"networkidle"}); await p.screenshot({path:"/tmp/caso-depois/socia-caso-vazio.png"});
t=await texto(p);
confere("A. 'Sem responsavel' em vez de 'Responsavel:'", /Sem responsável/.test(t) && !/Responsável:/.test(t), "");
confere("A. sem 'Abrir conversa' (caso SEM conversa)", !/Abrir conversa/.test(t), "");
confere("B. faixa 'Sem responsavel · atribua em ···'", /Sem responsável · atribua em/.test(t), "");
confere("C. historico vazio para quem PODE ver diz 'Nenhum evento ainda' (nao a frase de papel)", /Nenhum evento ainda/.test(t) && !/não está disponível para o seu papel/.test(t), "");
confere("D. sem secao de documentos quando nao ha", !/Documentos/.test(t.replace("Documentos recebidos","")), "");
confere("E. CNJ vazio = 'Informar', nao 'Editar'", await tem(p,".editar-inline > summary:has-text('Informar')"), "");
await p.close();

// ---- SOCIA no caso 3 (encerrado) ----
p=await entra("socia@ux.local");
await p.goto(`${APP}/escritorio/${F}/casos/${CA3}`,{waitUntil:"networkidle"});
t=await texto(p);
confere("encerrado: selo neutro, sem 'Registrar atualizacao', sem faixa, menu com Reabrir", /Encerrado/.test(t) && !(await tem(p,".acao-primaria")) && !(await tem(p,".faixa-de-estado")) && /Reabrir caso/.test(t), "");
await p.close();

// ---- ADVOGADO responsavel (Rafael) ----
p=await entra("adv@ux.local");
await p.goto(`${APP}/escritorio/${F}/casos/${CA1}`,{waitUntil:"networkidle"}); await p.screenshot({path:"/tmp/caso-depois/advogado-1440.png"});
t=await texto(p);
confere("advogado responsavel: registra, edita CNJ, ve historico, SEM atribuir", await tem(p,".acao-primaria") && await tem(p,".editar-inline") && /Tribunal/.test(t) && !/Advogado responsável/.test(t), "");
await p.close();

// ---- ADVOGADO NAO responsavel (Bruna): nao e participante ----
p=await entra("adv2@ux.local");
await p.goto(`${APP}/escritorio/${F}/casos/${CA1}`,{waitUntil:"networkidle"});
t=await texto(p);
confere("advogado NAO responsavel: caso indisponivel OU historico fora do alcance, sem acoes de gestao", /não está disponível|Caso indisponível/.test(t) && !(await tem(p,".acao-primaria")), t.slice(0,80));
await p.close();

// ---- SECRETARIA: gerencia, NAO le a correspondencia ----
p=await entra("sec@ux.local");
await p.goto(`${APP}/escritorio/${F}/casos/${CA1}`,{waitUntil:"networkidle"}); await p.screenshot({path:"/tmp/caso-depois/secretaria-1440.png"});
t=await texto(p);
confere("F. secretaria: 'historico nao disponivel para o seu papel' (NUNCA 'nenhuma atualizacao')", /não está disponível para o seu papel/.test(t) && !/Nenhum evento ainda/.test(t), "");
confere("F. secretaria: gerencia (menu ··· com Atribuir/Encerrar), nao registra atualizacao", await tem(p,".cabecalho-do-caso .moderacao") && !(await tem(p,".acao-primaria")), "");
confere("F. secretaria: ve responsavel e 'Abrir conversa' (contexto administrativo)", /Responsável: Rafael/.test(t) && /Abrir conversa/.test(t), "");
await p.close();

// ---- G. IDA E VOLTA: conversa → Ver caso → Abrir conversa → MESMA conversa, lista mantida ----
p=await entra("socia@ux.local");
await p.goto(`${APP}/escritorio/${F}/conversas/${C1}`,{waitUntil:"networkidle"});
await p.locator(".cabecalho-do-chat .link-do-caso",{hasText:"Ver caso"}).click(); await p.waitForURL(new RegExp(`/casos/${CA1}`),{timeout:15000}); await p.locator(".detalhe-do-caso").waitFor({timeout:15000});
confere("G. Ver caso leva ao detalhe, com a LISTA de casos a esquerda", await tem(p,".painel-lista"), p.url().split("/escritorio/")[1]);
await p.locator(".cabecalho-do-caso .link-do-caso",{hasText:"Abrir conversa"}).click(); await p.waitForURL(new RegExp(`/conversas/${C1}`),{timeout:15000}); await p.locator(".chat").waitFor({timeout:15000}); await p.waitForTimeout(400);
confere("G. Abrir conversa volta a MESMA conversa, com a lista de conversas a esquerda", p.url().includes(C1) && await tem(p,".painel-lista"), p.url().split("/escritorio/")[1]);
confere("G. e a conversa abre no fim, pronta para responder", await p.evaluate(()=>{const l=document.querySelector(".chat"); return l? l.scrollHeight-l.scrollTop-l.clientHeight<5 : false;}), "");
await p.close();

// ---- 1024 e escuro ----
p=await entra("socia@ux.local",{viewport:{width:1024,height:900}});
await p.goto(`${APP}/escritorio/${F}/casos/${CA1}`,{waitUntil:"networkidle"}); await p.screenshot({path:"/tmp/caso-depois/socia-1024.png"});
// NENHUM par de blocos do cabecalho se sobrepoe, e o nome esta inteiro.
const sobrepoe=await p.evaluate(()=>{const els=[".cliente",".atendimento",".acoes-do-chat",".linha-2"].map(s=>document.querySelector(".cabecalho-do-caso "+s)).filter(Boolean).map(e=>e.getBoundingClientRect()); for(let i=0;i<els.length;i++) for(let j=i+1;j<els.length;j++){const a=els[i],c=els[j]; if(!(a.right<=c.left+1||c.right<=a.left+1||a.bottom<=c.top+1||c.bottom<=a.top+1)) return true;} return false;});
const nomeInteiro=await p.evaluate(()=>{const e=document.querySelector(".cabecalho-do-caso .cliente"); return e? e.scrollWidth<=e.clientWidth+1 : false;});
confere("1024: nada no cabecalho se sobrepoe, e o nome do cliente esta inteiro", !sobrepoe && nomeInteiro, `sobrepoe=${sobrepoe} nomeInteiro=${nomeInteiro}`);
await p.close();
p=await entra("socia@ux.local",{colorScheme:"dark"});
await p.goto(`${APP}/escritorio/${F}/casos/${CA1}`,{waitUntil:"networkidle"}); await p.screenshot({path:"/tmp/caso-depois/socia-dark.png"});
await p.close();

await b.close(); console.log(falhas===0?"\nTUDO VERDE":`\n${falhas} FALHAS`); process.exit(falhas===0?0:1);
