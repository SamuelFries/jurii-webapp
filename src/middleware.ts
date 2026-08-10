import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Renova a sessão a cada requisição e faz o portão das rotas:
 *
 *  - /assinatura e /planos exigem login e mandam para /entrar sem ele;
 *  - /entrar com sessão ativa manda para /assinatura, senão a pessoa
 *    logada cai num formulário de login sem motivo.
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
  const precisaDeLogin = !rota.startsWith("/entrar");

  if (precisaDeLogin && !user) {
    const destino = requisicao.nextUrl.clone();
    destino.pathname = "/entrar";
    return NextResponse.redirect(destino);
  }

  if (rota.startsWith("/entrar") && user) {
    const destino = requisicao.nextUrl.clone();
    destino.pathname = "/assinatura";
    return NextResponse.redirect(destino);
  }

  return resposta;
}

export const config = {
  // Tudo, menos estáticos e o webhook (chamada de máquina, sem cookie).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/webhooks).*)"],
};
