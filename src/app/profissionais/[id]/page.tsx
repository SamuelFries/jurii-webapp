import Link from "next/link";

import { AvaliacoesDoProfissional } from "@/components/avaliacoes-do-profissional";
import { CascaDeTrabalho } from "@/components/casca-de-trabalho";
import { contextoLogado, exigeProfissional } from "@/lib/contexto";
import { advogadoDaLinha } from "@/lib/dominio/descoberta";
import { estrelas } from "@/lib/dominio/avaliacoes";
import { destinoInicial } from "@/lib/fluxos";

export const dynamic = "force-dynamic";

/**
 * O CARTÃO PÚBLICO do advogado, via fetch_lawyer_public_profile: a única
 * porta que entrega o NOME por id, porque profiles não é público e a
 * consulta precisa de SECURITY DEFINER. É a MESMA função que o app usa na
 * tela de caso e no chat, com o argumento lawyer_profile_id_value.
 *
 * MUDOU DE DONO com o recorte profissional: antes era uma tela do fluxo do
 * cliente (descobrir e contratar). Agora é a vitrine do profissional, a
 * página que o escritório manda para um prospecto e onde o advogado
 * confere como aparece. Quem contrata faz isso pelo aplicativo, então as
 * ações de cliente (Conversar, favoritar) saíram daqui: no webapp elas
 * apontariam para telas que não existem mais.
 *
 * AINDA EXIGE LOGIN. Torná-la pública é a decisão que destrava o link para
 * prospecto e o Google; está descrita no README, e é deliberadamente um
 * passo separado, porque é irreversível na prática (uma vez indexada, a
 * página fica em cache de terceiros).
 */
export default async function CartaoDoAdvogado({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { id } = await params;
  // As ações de avaliação voltam para cá com ?erro=; sem exibir, a recusa
  // do servidor sumiria em silêncio.
  const { erro } = await searchParams;
  const contexto = await contextoLogado();
  exigeProfissional(contexto);
  const voltar = `/profissionais/${id}`;
  const casa = destinoInicial(contexto.fluxos);

  // lawyer_profile_id_value, e nao lawyer_id_value: PostgREST resolve RPC
  // por NOME de argumento, e este e o nome que a funcao tem em produção
  // desde a 20260718180000 (a mesma que o app chama).
  const perfilRes = await contexto.supabase.rpc("fetch_lawyer_public_profile", {
    lawyer_profile_id_value: id,
  });

  const linha = ((perfilRes.data as unknown[]) ?? [])[0] as
    | Record<string, unknown>
    | undefined;

  if (perfilRes.error || linha === undefined) {
    return (
      <CascaDeTrabalho
        fluxo={contexto.fluxos.escritorio !== null ? "escritorio" : "advogado"}
        fluxos={contexto.fluxos}
      >
        <div className="pagina-de-trabalho">
          <div className="miolo">
            <p className="vazio">
              {perfilRes.error
                ? "Não foi possível carregar este perfil agora."
                : "Este advogado não está mais disponível no Jurii."}
            </p>
            <Link className="botao secundario" href={casa}>
              Voltar
            </Link>
          </div>
        </div>
      </CascaDeTrabalho>
    );
  }

  const advogado = advogadoDaLinha(linha);
  const oab =
    linha.oab_number != null && linha.oab_state != null
      ? `OAB ${String(linha.oab_number)}/${String(linha.oab_state)}`
      : null;

  return (
    <CascaDeTrabalho
      fluxo={contexto.fluxos.escritorio !== null ? "escritorio" : "advogado"}
      fluxos={contexto.fluxos}
    >
      <div className="pagina-de-trabalho">
        <div className="miolo" style={{ maxWidth: 720 }}>
          <div className="linha-topo">
            <h1 style={{ marginTop: 0 }}>{advogado.nome}</h1>
            <Link className="botao secundario" href={casa}>
              Voltar
            </Link>
          </div>
          {erro !== undefined && <p className="erro">{erro}</p>}
          <p className="subtitulo">
            É assim que este profissional aparece para quem procura no
            aplicativo.
          </p>

          <div className="cartao">
            <div className="linha-topo">
              <span className="avatar" aria-hidden>
                {advogado.avatarUrl !== null ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={advogado.avatarUrl} alt="" />
                ) : (
                  advogado.iniciais
                )}
              </span>
              <span className="acoes-do-topo">
                <span className="selo dourado">
                  {advogado.avaliacoes > 0
                    ? `${estrelas(advogado.nota)} ${advogado.nota.toFixed(1)} (${advogado.avaliacoes})`
                    : "Sem avaliações ainda"}
                </span>
              </span>
            </div>

            {advogado.bio !== "" && (
              <p style={{ marginBottom: 0 }}>{advogado.bio}</p>
            )}

            <p className="detalhe">
              {advogado.areas.length > 0
                ? advogado.areas.join(" · ")
                : advogado.areaPrincipal}
              {oab !== null ? ` · ${oab}` : ""}
            </p>
          </div>

          <AvaliacoesDoProfissional
            supabase={contexto.supabase}
            tipo="lawyer"
            id={id}
            voltar={voltar}
          />
        </div>
      </div>
    </CascaDeTrabalho>
  );
}
