import Link from "next/link";
import { redirect } from "next/navigation";

import { contextoLogado } from "@/lib/contexto";
import { destinoInicial } from "@/lib/fluxos";
import { rotuloDoStatusDaVerificacao } from "@/lib/dominio/verificacao";

import { FormularioDeVerificacao } from "./formulario";

export const dynamic = "force-dynamic";

/**
 * A porta de entrada do profissional no webapp.
 *
 * Antes daqui, criar conta no computador levava a um beco: a área do
 * advogado só abre com verificação APROVADA, e submeter a verificação só
 * existia no aplicativo. Ou seja, a ferramenta feita para o profissional
 * não conseguia criar um.
 *
 * Quem já é advogado aprovado não vê esta tela: vai para a mesa de
 * trabalho, porque reenviar verificação aprovada não é o que ele quer.
 */
export default async function VerificacaoDaOab({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string }>;
}) {
  const { ok } = await searchParams;
  const contexto = await contextoLogado();
  // QUALQUER vínculo já dá mesa de trabalho, então a pergunta é sobre a
  // lista: escritório deixou de ser um só, e "tem escritório" virou "tem
  // pelo menos um".
  if (
    contexto.fluxos.advogadoAprovado ||
    contexto.fluxos.escritorios.length > 0
  ) {
    redirect(destinoInicial(contexto.fluxos));
  }

  const { data } = await contexto.supabase
    .from("lawyer_verifications")
    .select("status, rejection_reason, submitted_at")
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const status = data?.status == null ? null : String(data.status);
  const motivo =
    data?.rejection_reason == null ? null : String(data.rejection_reason);
  // Pendente é a única situação em que reenviar não ajuda: já está na fila.
  const emAnalise = status === "pending";

  return (
    <main className="pagina">
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <div className="linha-topo">
          <h1 style={{ margin: 0 }}>Verificação da OAB</h1>
          <Link className="botao secundario compacto" href="/cliente">
            Voltar
          </Link>
        </div>
        <p className="subtitulo">
          A área de trabalho abre quando a Jurii confirma que você é advogado.
          A análise é feita por pessoas e leva alguns dias úteis.
        </p>

        {ok === "enviada" && (
          <p className="aviso-bom">
            Verificação enviada. Avisamos por notificação assim que a análise
            terminar, e a área de trabalho abre sozinha aqui.
          </p>
        )}

        {status !== null && (
          <div className="cartao" style={{ marginTop: 12 }}>
            <strong>{rotuloDoStatusDaVerificacao(status)}</strong>
            {emAnalise && (
              <p className="detalhe" style={{ marginTop: 4 }}>
                Já recebemos seus dados. Não é preciso enviar de novo.
              </p>
            )}
            {status === "rejected" && (
              <p className="detalhe" style={{ marginTop: 4 }}>
                {motivo !== null && motivo !== ""
                  ? motivo
                  : "Você pode corrigir os dados e enviar novamente abaixo."}
              </p>
            )}
          </div>
        )}

        {!emAnalise && (
          <FormularioDeVerificacao usuarioId={contexto.usuario.id} />
        )}
      </div>
    </main>
  );
}
