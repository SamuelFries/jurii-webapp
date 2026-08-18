import { chromium } from "playwright";
const APP="http://localhost:3123", F="ee000001-0000-4000-8000-000000000001";
const b = await chromium.launch();
const telas = [
  ["visao", `/escritorio/${F}`], ["mensagens", `/escritorio/${F}/mensagens`],
  ["casos", `/escritorio/${F}/casos`], ["equipe", `/escritorio/${F}/equipe`],
  ["notificacoes", `/escritorio/${F}/notificacoes`], ["assinatura", `/escritorio/${F}/assinatura`],
  ["perfil", `/escritorio/${F}/perfil`], ["advogado", `/advogado`],
];
for (const tema of ["light","dark"]) {
  const p = await b.newPage({ colorScheme: tema, viewport: { width: 1440, height: 900 } });
  await p.goto(`${APP}/entrar`); await p.fill("#email","socia@ux.local"); await p.fill("#senha","provadeux12345");
  await p.click('button[type="submit"]'); await p.waitForURL(u=>!u.pathname.startsWith("/entrar"),{timeout:15000});
  for (const [nome, rota] of telas) {
    await p.goto(APP+rota, { waitUntil: "networkidle" }); await p.waitForTimeout(400);
    await p.screenshot({ path: `/tmp/ux-antes/${nome}-${tema}.png` });
  }
  // e uma estreita
  await p.setViewportSize({ width: 1024, height: 768 });
  await p.goto(`${APP}/escritorio/${F}`, { waitUntil: "networkidle" });
  await p.screenshot({ path: `/tmp/ux-antes/visao-1024-${tema}.png` });
  await p.close();
}
await b.close(); console.log("fotos ok");
