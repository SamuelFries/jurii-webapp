import { redirect } from "next/navigation";

/** Caminho da primeira versão; a assinatura mora no fluxo do escritório. */
export default function RedirecionaAssinatura() {
  redirect("/escritorio/assinatura");
}
