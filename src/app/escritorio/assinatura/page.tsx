import Link from "next/link";

import { contextoLogado } from "@/lib/contexto";
import {
  assinaturaDaLinha,
  formataPreco,
  precoMensalDoAnual,
  rotuloDaEquipe,
  rotuloDeStatus,
} from "@/lib/licenca";
import { sair } from "@/app/entrar/acoes";

/** Sempre no servidor e sempre fresco: estado de assinatura em cache é como
 * a pessoa paga e continua vendo "pendente". */
export const dynamic = "force-dynamic";

export default async function PaginaDaAssinatura() {
  const contexto = await contextoLogado();

  const { data: linha } = await contexto.supabase
    .from("law_firm_license_subscriptions")
    .select("*, law_firm_license_plans(*)")
    .neq("status", "canceled")
    .maybeSingle();

  const assinatura = linha ? assinaturaDaLinha(linha) : null;
  const agora = new Date();

  const conteudo = (
    <>
      <h1>Assinatura</h1>
      <p className="subtitulo">
        O plano do seu escritório, o mesmo que aparece no aplicativo.
      </p>

      {assinatura === null ? (
        <div className="cartao">
          <span className="selo">Sem plano</span>
          <p className="detalhe" style={{ marginTop: 10 }}>
            Você ainda não escolheu um plano. A escolha libera o cadastro e a
            verificação do escritório no aplicativo, com 30 dias de teste
            grátis.
          </p>
          <Link className="botao" href="/escritorio/planos">
            Escolher um plano
          </Link>
        </div>
      ) : (
        <div className="cartao">
          <span
            className={
              assinatura.status === "past_due" ? "selo" : "selo dourado"
            }
          >
            {rotuloDeStatus(assinatura, agora)}
          </span>

          {assinatura.plano !== null && (
            <>
              <p className="preco" style={{ marginBottom: 0 }}>
                {assinatura.billingCycle === "annual"
                  ? (precoMensalDoAnual(assinatura.plano) ??
                    formataPreco(assinatura.plano.monthlyPriceCents))
                  : formataPreco(assinatura.plano.monthlyPriceCents)}
                <span className="sufixo"> por mês</span>
              </p>
              <p className="detalhe">
                {assinatura.billingCycle === "annual"
                  ? "Cobrado anualmente."
                  : "Cobrado mensalmente."}{" "}
                {rotuloDaEquipe(assinatura.plano)}.
              </p>
            </>
          )}

          <Link className="botao secundario" href="/escritorio/planos">
            Trocar de plano
          </Link>
        </div>
      )}
    </>
  );

  // Quem já tem vínculo ativo navega com a casca do fluxo; o contratante
  // pré-verificação (escolheu plano, escritório ainda em análise no app)
  // vê a página solta, porque não há fluxo de escritório ainda.
  if (contexto.fluxos.escritorio !== null) {
    return (
        <div className="pagina-de-trabalho">
          <div className="miolo" style={{ maxWidth: 560 }}>
            {conteudo}
          </div>
        </div>
    );
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
      {conteudo}
    </main>
  );
}
