import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * O cliente do SERVIDOR (páginas e server actions), autenticado como a
 * PESSOA, pelos cookies da sessão. Nada aqui usa service_role: toda leitura
 * e escrita passa pela RLS, igual ao app.
 */
export async function clienteDoServidor() {
  const jarDeCookies = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return jarDeCookies.getAll();
        },
        setAll(paraGravar) {
          try {
            for (const { name, value, options } of paraGravar) {
              jarDeCookies.set(name, value, options);
            }
          } catch {
            // Chamado de um Server Component, onde gravar cookie é proibido.
            // O middleware é quem renova a sessão; aqui é seguro ignorar.
          }
        },
      },
    },
  );
}
