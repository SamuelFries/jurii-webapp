import { createBrowserClient } from "@supabase/ssr";

/**
 * O cliente do NAVEGADOR. Usa a publishable key, que é pública por desenho
 * (é a mesma que vai no binário do app Flutter): a segurança vem da RLS.
 * A sessão vive em cookies para o servidor enxergar o login nas páginas
 * renderizadas lá.
 */
export function clienteDoNavegador() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
