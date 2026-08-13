import Link from "next/link";
import { redirect } from "next/navigation";

import { CascaDeTrabalho } from "@/components/casca-de-trabalho";
import { contextoLogado } from "@/lib/contexto";
import { destinoInicial } from "@/lib/fluxos";
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

  // A LICENÇA vem junto porque a policy de INSERT de law_firm_verifications
  // exige has_law_firm_license(auth.uid()). Sem ela o formulário inteiro é
  // um beco: a pessoa preenchia CNPJ, endereço e cinco arquivos e recebia
  // "confira os dados e tente de novo", que culpa os dados dela por uma
  // falta de plano. O app já faz a mesma bifurcação (FirmBenefitsScreen
  // manda para o plano antes do formulário).
  const [{ data }, { data: licenca }] = await Promise.all([
    contexto.supabase
      .from("law_firm_verifications")
      .select("status, firm_name, rejection_reason, created_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    contexto.supabase
      .from("law_firm_license_subscriptions")
      .select("status")
      .eq("owner_profile_id", contexto.usuario.id)
      .in("status", ["trialing", "active"])
      .limit(1)
      .maybeSingle(),
  ]);
  const temLicenca = licenca != null;

  const status = data?.status == null ? null : String(data.status);
  const motivo =
    data?.rejection_reason == null ? null : String(data.rejection_reason);
  const emAnalise = status === "pending";

  const corpo = (
    <div className="miolo" style={{ maxWidth: 680 }}>
      <div className="linha-topo">
        <h1 style={{ margin: 0 }}>Abrir escritório</h1>
        {/* Volta para a casa DE QUEM ESTÁ AQUI. Fixo em /advogado, mandava
            cliente e estagiário para uma tela que os devolve. */}
        <Link
          className="botao secundario compacto"
          href={destinoInicial(contexto.fluxos)}
        >
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

      {!emAnalise &&
        (temLicenca ? (
          <FormularioDeEscritorio usuarioId={contexto.usuario.id} />
        ) : (
          <div className="cartao" style={{ marginTop: 16 }}>
            <strong>Comece pelo plano</strong>
            <p className="detalhe" style={{ marginTop: 4 }}>
              O escritório abre com uma licença, e a primeira é um teste
              grátis de 30 dias. Escolha o plano e a papelada continua aqui,
              com os dados que você já tiver à mão.
            </p>
            <Link
              className="botao compacto"
              href="/escritorio/planos"
              style={{ marginTop: 10 }}
            >
              Ver os planos
            </Link>
          </div>
        ))}
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
