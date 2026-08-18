import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Renova a sessão a cada requisição e faz o portão das rotas:
 *
 *  - toda rota exige login e manda para /entrar sem ele;
 *  - /entrar com sessão ativa manda para a raiz, que roteia a pessoa para
 *    o fluxo dela (escritório > advogado > cliente).
 *
 * O portão DE VERDADE continua sendo a RLS: sem sessão, o banco não
 * devolve nada. Este aqui existe para a pessoa nunca ver uma tela vazia
 * no lugar de "entre primeiro".
 */
export async function middleware(requisicao: NextRequest) {
  let resposta = NextResponse.next({ request: requisicao });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return requisicao.cookies.getAll();
        },
        setAll(paraGravar) {
          for (const { name, value } of paraGravar) {
            requisicao.cookies.set(name, value);
          }
          resposta = NextResponse.next({ request: requisicao });
          for (const { name, value, options } of paraGravar) {
            resposta.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // getUser (e não getSession): valida o token no servidor do Supabase.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const rota = requisicao.nextUrl.pathname;
  // Tudo é logado, menos a porta de entrada (o webhook nem passa por aqui:
  // está fora do matcher, porque chamada de máquina não tem cookie).
  const rotaPublica =
    rota.startsWith("/entrar") ||
    rota.startsWith("/criar-conta") ||
    rota.startsWith("/recuperar") ||
    rota.startsWith("/redefinir") ||
    // O convite de equipe chega a quem AINDA não tem conta: a página precisa
    // dizer quem chamou e para quê antes do login, senão a pessoa cria conta
    // às cegas. O token não abre nada sozinho — aceitar continua exigindo
    // sessão, e é o banco quem valida.
    rota.startsWith("/convite");
  const precisaDeLogin = !rotaPublica;

  if (precisaDeLogin && !user) {
    const destino = requisicao.nextUrl.clone();
    destino.pathname = "/entrar";
    return NextResponse.redirect(destino);
  }

  if ((rota.startsWith("/entrar") || rota.startsWith("/criar-conta")) && user) {
    const destino = requisicao.nextUrl.clone();
    destino.pathname = "/";
    return NextResponse.redirect(destino);
  }

  return resposta;
}

export const config = {
  // Tudo, menos estáticos e o webhook (chamada de máquina, sem cookie).
  // O `.*\\..*` deixa passar qualquer arquivo com extensão (as imagens da
  // marca em /marca, o icon.svg): sem isso o portão redirecionava o PNG do
  // lockup para /entrar e a tela de login abria sem o próprio logo.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/webhooks|.*\\..*).*)",
  ],
};
