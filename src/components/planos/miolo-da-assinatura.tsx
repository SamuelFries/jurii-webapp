import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";

import { irParaPagamento } from "@/app/pagamento/acoes";
import { provedorConfigurado } from "@/lib/pagamentos/provedor";
import {
  assinaturaDaLinha,
  formataPreco,
  precoMensalDoAnual,
  rotuloDaEquipe,
  rotuloDeStatus,
} from "@/lib/licenca";

/**
 * A tela de assinatura SEM a casca, pelo mesmo motivo do miolo de planos:
 * ela vale para o contratante que ainda não tem banca (acabou de escolher o
 * primeiro plano e espera a verificação) e para o gestor de um escritório
 * já de pé. O `escritorioId` é a única diferença.
 */
export async function MioloDaAssinatura({
  supabase,
  escritorioId,
}: {
  supabase: SupabaseClient;
  /** Nulo antes de o escritório existir. */
  escritorioId: string | null;
}) {
  let consulta = supabase
    .from("law_firm_license_subscriptions")
    .select("*, law_firm_license_plans(*)")
    .neq("status", "canceled");
  // Uma linha POR ESCRITÓRIO gerido é o que a policy entrega, então quem
  // cuida de dois via o maybeSingle estourar.
  //
  // SEM escritório, a linha certa é a LICENÇA NÃO GASTA (law_firm_id nulo).
  // Não filtrar aqui era seguro enquanto a licença era por pessoa e só havia
  // uma; desde que a cobrança virou por escritório, quem já tem banca e
  // comprou a segunda licença tem duas linhas visíveis, e o maybeSingle
  // estouraria justo na tela que deveria mostrar a compra nova.
  if (escritorioId !== null) {
    consulta = consulta.eq("law_firm_id", escritorioId);
  } else {
    consulta = consulta.is("law_firm_id", null);
  }
  const { data: linha } = await consulta.maybeSingle();

  const assinatura = linha ? assinaturaDaLinha(linha) : null;
  // Já ativa não precisa pagar de novo, e cancelada não se regulariza por
  // aqui: reativar é contratar de novo, com a pessoa escolhendo o plano.
  const podePagar =
    provedorConfigurado() !== null &&
    assinatura !== null &&
    (assinatura.status === "trialing" || assinatura.status === "past_due");
  const agora = new Date();
  // O funil pré-escritório mora fora do segmento, porque quem ainda não tem
  // banca não tem id para pôr na rota.
  const paginaDePlanos =
    escritorioId === null ? "/planos" : `/escritorio/${escritorioId}/planos`;

  return (
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
            verificação do escritório, aqui mesmo ou no aplicativo, com 30
            dias de teste grátis.
          </p>
          <Link className="botao" href={paginaDePlanos}>
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

          {/* PAGAR É OFERECIDO, e o botão só existe porque agora há
              provedor: antes, oferecer levaria a lugar nenhum, e botão que
              não paga é o link morto que a casa não admite.
              Durante o teste ele NÃO encurta os dias que faltam: a primeira
              cobrança é marcada para o fim do teste, então assinar cedo é
              deixar o pagamento pronto. */}
          {podePagar && (
            <form action={irParaPagamento} style={{ marginBottom: 10 }}>
              <input
                type="hidden"
                name="escritorio"
                value={escritorioId ?? ""}
              />
              <button type="submit">
                {assinatura.status === "past_due"
                  ? "Regularizar pagamento"
                  : "Ativar cobrança"}
              </button>
            </form>
          )}

          <Link className="botao secundario" href={paginaDePlanos}>
            Trocar de plano
          </Link>
        </div>
      )}
    </>
  );
}
