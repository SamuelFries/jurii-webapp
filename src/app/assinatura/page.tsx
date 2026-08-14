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
  // Quem é SÓCIO já tem a assinatura de uma banca, e essa tem rota própria,
  // com a casca do fluxo em volta. A pergunta é sobre ser sócio, e não sobre
  // ter vínculo: a licença é por pessoa, então quem trabalha na banca dos
  // outros não tem assinatura para ver aqui.
  const minhaBanca = escritorioDoSocio(contexto.fluxos);
  if (minhaBanca !== null) redirect(`/escritorio/${minhaBanca.id}/assinatura`);

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
