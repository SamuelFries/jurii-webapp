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
 * QUEM É BARRADO AQUI é quem não tem LICENÇA sobrando, e ninguém mais.
 *
 * A régua já foi outras duas, e as duas erravam. Primeiro "tem qualquer
 * vínculo", que expulsava o estagiário e a secretária que queriam fundar a
 * banca deles. Depois "já é sócio", que era a licença por pessoa dita com
 * outra palavra. Desde que a cobrança virou por escritório, abrir uma banca
 * GASTA uma licença e abrir a segunda pede outra, então a régua da tela e a
 * do banco (has_law_firm_license) passaram a ser a mesma frase.
 */
export default async function AbrirEscritorio({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  const { ok, erro } = await searchParams;
  const contexto = await contextoLogado();
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
    // A MESMA PERGUNTA QUE A POLICY FAZ, e não uma reprodução dela. Esta tela
    // já espelhou a regra à mão (licença não gasta, status na lista) e o
    // espelho quebrou quando a expiração do teste passou a ser derivada:
    // `status` fica 'trialing' para sempre, então a versão literal convidava
    // a preencher CNPJ, endereço e cinco arquivos para o banco recusar no
    // fim. has_law_firm_license é a própria função do `with check`.
    contexto.supabase.rpc("has_law_firm_license", {
      profile_id_value: contexto.usuario.id,
    }),
  ]);
  const temLicenca = licenca === true;

  // "NUNCA TEVE" E "TEVE E ACABOU" PRECISAM DE COISAS DIFERENTES, e só o
  // booleano do portão não distingue as duas. Quem nunca teve escolhe um
  // plano e ganha o teste; quem teve o teste vencer precisa PAGAR, e
  // mandá-la para a lista de planos com a promessa de "30 dias grátis"
  // seria oferecer de novo o que ela já usou.
  const { data: licencaMorta } = temLicenca
    ? { data: null }
    : await contexto.supabase
        .from("law_firm_license_subscriptions")
        .select("status")
        .eq("owner_profile_id", contexto.usuario.id)
        .is("law_firm_id", null)
        .neq("status", "canceled")
        .limit(1)
        .maybeSingle();
  const licencaVencida = licencaMorta != null;

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
            <strong>
              {licencaVencida ? "Seu teste grátis acabou" : "Comece pelo plano"}
            </strong>
            <p className="detalhe" style={{ marginTop: 4 }}>
              {licencaVencida
                ? "O plano que você escolheu continua guardado. Ative a cobrança e a abertura do escritório segue de onde parou, com os dados que você já tiver à mão."
                : "O escritório abre com uma licença, e a primeira é um teste grátis de 30 dias. Escolha o plano e a papelada continua aqui, com os dados que você já tiver à mão."}
            </p>
            {/* Destinos diferentes porque as necessidades são diferentes:
                quem nunca teve precisa ESCOLHER, quem já teve precisa PAGAR.
                E "/planos" (não uma rota de escritório) porque quem está
                aqui ainda não tem banca, logo não tem id para a rota
                segmentada. */}
            <Link
              className="botao compacto"
              href={licencaVencida ? "/assinatura" : "/planos"}
              style={{ marginTop: 10 }}
            >
              {licencaVencida ? "Ativar cobrança" : "Ver os planos"}
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
