import Link from "next/link";
import { redirect } from "next/navigation";

import { sair } from "@/app/entrar/acoes";
import { MioloDaAssinatura } from "@/components/planos/miolo-da-assinatura";
import { contextoLogado } from "@/lib/contexto";
import { escritorioDoSocio } from "@/lib/fluxos";

/** Sempre no servidor e sempre fresco: estado de assinatura em cache é como
 * a pessoa paga e continua vendo "pendente". */
export const dynamic = "force-dynamic";

/**
 * A assinatura de quem AINDA NÃO tem escritório: escolheu o plano e espera
 * a verificação da banca sair no aplicativo. Mora fora do segmento pelo
 * mesmo motivo que `/planos`: sem escritório não existe id para a rota.
 *
 * Traz cabeçalho próprio, com marca e "Sair", porque não há mesa de
 * trabalho para servir de casca: esta pessoa ainda não tem fluxo nenhum
 * aberto, e uma tela sem saída prenderia quem quisesse trocar de conta.
 */
export default async function AssinaturaDaPrimeiraLicenca() {
  const contexto = await contextoLogado();
  // Esta rota é a da licença que AINDA NÃO virou banca. Quem já é sócio tem a
  // assinatura da banca em rota própria, com a casca do fluxo em volta, e é
  // para lá que vai.
  //
  // MAS SÓ SE NÃO HOUVER LICENÇA NOVA para mostrar. Desde que a cobrança
  // virou por escritório, um sócio pode ter comprado a segunda licença para
  // abrir a segunda banca, e ela mora aqui: redirecionar sem olhar deixaria
  // essa pessoa sem tela nenhuma para a compra que acabou de fazer.
  const { data: licencaNova } = await contexto.supabase
    .from("law_firm_license_subscriptions")
    .select("id")
    .eq("owner_profile_id", contexto.usuario.id)
    .is("law_firm_id", null)
    .neq("status", "canceled")
    .limit(1)
    .maybeSingle();

  const minhaBanca = escritorioDoSocio(contexto.fluxos);
  if (licencaNova == null && minhaBanca !== null) {
    redirect(`/escritorio/${minhaBanca.id}/assinatura`);
  }

  return (
    <main className="pagina">
      <div className="linha-topo">
        <Link href="/" className="marca marca-pequena">
          jurii<span className="ouro">.</span>
        </Link>
        <form action={sair}>
          <button type="submit" className="discreto">
            Sair
          </button>
        </form>
      </div>
      <MioloDaAssinatura supabase={contexto.supabase} escritorioId={null} />
    </main>
  );
}
