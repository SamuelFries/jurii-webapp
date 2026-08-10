import { redirect } from "next/navigation";

/** Caminho da primeira versão; os planos moram no fluxo do escritório. */
export default function RedirecionaPlanos() {
  redirect("/escritorio/planos");
}
