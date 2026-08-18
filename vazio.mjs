import { chromium } from "playwright";
const APP="http://localhost:3123", F="ee000001-0000-4000-8000-000000000001";
const b = await chromium.launch();
// A SECRETARIA (membro comum) ve a assinatura como? E o advogado ve a visao geral?
for (const [quem, email, rota, nome] of [
  ["secretaria", "sec@ux.local", `/escritorio/${F}/assinatura`, "assinatura-membro"],
  ["secretaria", "sec@ux.local", `/escritorio/${F}`, "visao-secretaria"],
  ["advogado", "adv@ux.local", `/advogado`, "area-advogado"],
]) {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto(`${APP}/entrar`); await p.fill("#email", email); await p.fill("#senha","provadeux12345");
  await p.click('button[type="submit"]'); await p.waitForURL(u=>!u.pathname.startsWith("/entrar"),{timeout:15000});
  await p.goto(APP+rota, { waitUntil: "networkidle" }); await p.waitForTimeout(300);
  await p.screenshot({ path: `/tmp/ux-antes/${nome}.png` });
  await p.close();
}
await b.close(); console.log("ok");
