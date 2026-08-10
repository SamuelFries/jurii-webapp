import { redirect } from "next/navigation";

/** A raiz não tem conteúdo próprio: o middleware manda quem não tem sessão
 * para /entrar; quem tem cai na home do fluxo do cliente. */
export default function PaginaRaiz() {
  redirect("/inicio");
}
