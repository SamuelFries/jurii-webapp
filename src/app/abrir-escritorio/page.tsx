import Link from "next/link";
import { redirect } from "next/navigation";

import { CascaDeTrabalho } from "@/components/casca-de-trabalho";
import { contextoLogado } from "@/lib/contexto";
import { rotuloDoStatusDaVerificacao } from "@/lib/dominio/verificacao";

import { FormularioDeEscritorio } from "./formulario";

export const dynamic = "force-dynamic";

/**
 * Abrir escritório pelo computador.
 *
 * Registro de escritório é PAPELADA: CNPJ, endereço, telefone comercial e
 * uma foto. Isso se faz sentado, com os documentos à mão, e era justamente
 * o que só existia no celular. Aqui ainda reaproveita a cascata de CEP, que
 * preenche endereço e coordenada sozinha.
 *
 * Quem JÁ tem escritório ativo não vê esta tela: vai para o painel dele.
 */
export default async function AbrirEscritorio({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  const { ok, erro } = await searchParams;
  const contexto = await contextoLogado();
  if (contexto.fluxos.escritorio !== null) redirect("/escritorio");

  const { data } = await contexto.supabase
    .from("law_firm_verifications")
    .select("status, firm_name, rejection_reason, created_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const status = data?.status == null ? null : String(data.status);
  const motivo =
    data?.rejection_reason == null ? null : String(data.rejection_reason);
  const emAnalise = status === "pending";

  const corpo = (
    <div className="miolo" style={{ maxWidth: 680 }}>
      <div className="linha-topo">
        <h1 style={{ margin: 0 }}>Abrir escritório</h1>
        <Link className="botao secundario compacto" href="/advogado">
          Voltar
        </Link>
      </div>
      <p className="subtitulo">
        O escritório dá à equipe uma carteira de casos em comum, atendimento
        pelo nome da banca e um perfil próprio na busca do cliente.
      </p>

      {erro !== undefined && <p className="erro">{erro}</p>}
      {ok === "enviado" && (
        <p className="aviso-bom">
          Pedido enviado. Avisamos quando a análise terminar, e o painel do
          escritório abre sozinho aqui.
        </p>
      )}

      {status !== null && (
        <div className="cartao" style={{ marginTop: 12 }}>
          <strong>{rotuloDoStatusDaVerificacao(status)}</strong>
          {data?.firm_name != null && (
            <p className="detalhe" style={{ marginTop: 4 }}>
              {String(data.firm_name)}
            </p>
          )}
          {emAnalise && (
            <p className="detalhe">
              Já recebemos o pedido. Não é preciso enviar de novo.
            </p>
          )}
          {status === "rejected" && motivo !== null && motivo !== "" && (
            <p className="detalhe">{motivo}</p>
          )}
        </div>
      )}

      {!emAnalise && (
        <FormularioDeEscritorio usuarioId={contexto.usuario.id} />
      )}
    </div>
  );

  // Advogado aprovado já tem mesa de trabalho, e sai dela para vir aqui:
  // manter a barra lateral evita que ele se sinta expulso do sistema.
  if (contexto.fluxos.advogadoAprovado) {
    return (
      <CascaDeTrabalho
        fluxo="advogado"
        fluxos={contexto.fluxos}
      >
        <div className="pagina-de-trabalho">{corpo}</div>
      </CascaDeTrabalho>
    );
  }

  return <main className="pagina">{corpo}</main>;
}
