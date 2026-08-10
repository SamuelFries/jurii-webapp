import { redirect } from "next/navigation";

/** A raiz não tem conteúdo próprio: o middleware decide entre /entrar e
 * /assinatura pela sessão, então basta apontar para a área logada. */
export default function PaginaRaiz() {
  redirect("/assinatura");
}
