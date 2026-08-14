import Link from "next/link";

import { AvaliacoesDoProfissional } from "@/components/avaliacoes-do-profissional";
import { CascaDeTrabalho } from "@/components/casca-de-trabalho";
import {
  contextoLogado,
  escritorioPreferido,
  exigeProfissional,
} from "@/lib/contexto";
import { estrelas } from "@/lib/dominio/avaliacoes";
import { escritorioDaLinha } from "@/lib/dominio/descoberta";
import { agrupaPorDia, intervaloDaLinha } from "@/lib/dominio/horarios";
import { destinoInicial, escritorioPadrao } from "@/lib/fluxos";

export const dynamic = "force-dynamic";

/**
 * O CARTÃO PÚBLICO do escritório, espelho do LawFirmProfileScreen do app:
 * apresentação, contato, endereço, horário de atendimento, áreas e
 * avaliações. Tudo leitura já pública pela RLS: law_firms_public_read,
 * horários com using(true), avaliações por RPC.
 *
 * MUDOU DE DONO com o recorte profissional: é a vitrine que o escritório
 * manda para um prospecto e onde a equipe confere como aparece. Quem
 * contrata faz isso pelo aplicativo, então as ações de cliente
 * (Conversar, favoritar) saíram: no webapp apontariam para telas que não
 * existem mais. Continua exigindo login; abrir ao público está descrito
 * no README e é decisão separada.
 */
export default async function CartaoDoEscritorio({
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
  const [contexto, preferido] = await Promise.all([
    contextoLogado(),
    escritorioPreferido(),
  ]);
  exigeProfissional(contexto);
  const voltar = `/escritorios/${id}`;
  const casa = destinoInicial(contexto.fluxos, preferido);
  // Esta tela é pública para o profissional e não pertence a escritório
  // nenhum, mas a casca sim: ela precisa saber QUAL banca está aberta para
  // montar a lateral e contar o sino. Vem do último aberto (o cookie), já
  // conferido contra os vínculos, e não do id da URL, que aqui é o
  // escritório VISITADO e pode não ter nada a ver com a pessoa.
  const escritorioDaCasca = escritorioPadrao(contexto.fluxos, preferido);
  const fluxoDaCasca = escritorioDaCasca !== null ? "escritorio" : "advogado";

  const [firmaRes, horariosRes] = await Promise.all([
    contexto.supabase
      .from("law_firms")
      .select("*")
      .eq("id", id)
      .eq("is_active", true)
      .maybeSingle(),
    contexto.supabase
      .from("law_firm_business_hours")
      .select("weekday, opens_at, closes_at")
      .eq("law_firm_id", id)
      .order("weekday")
      .order("opens_at"),
  ]);

  if (firmaRes.data == null) {
    return (
      <CascaDeTrabalho
        fluxo={fluxoDaCasca}
        fluxos={contexto.fluxos}
        escritorioId={escritorioDaCasca?.id ?? null}
      >
        <div className="pagina-de-trabalho">
          <div className="miolo">
            <p className="vazio">
              Este escritório não está mais disponível no Jurii.
            </p>
            <Link className="botao secundario" href={casa}>
              Voltar
            </Link>
          </div>
        </div>
      </CascaDeTrabalho>
    );
  }

  const firma = escritorioDaLinha(firmaRes.data as Record<string, unknown>);
  const dias = agrupaPorDia(
    (((horariosRes.data as unknown[]) ?? []) as Record<string, unknown>[]).map(
      intervaloDaLinha,
    ),
  );
  const linhaDoRow = firmaRes.data as Record<string, unknown>;
  const telefone = linhaDoRow.phone == null ? null : String(linhaDoRow.phone);
  const email = linhaDoRow.email == null ? null : String(linhaDoRow.email);
  const site =
    linhaDoRow.website_url == null ? null : String(linhaDoRow.website_url);

  return (
    <CascaDeTrabalho
      fluxo={fluxoDaCasca}
      fluxos={contexto.fluxos}
      escritorioId={escritorioDaCasca?.id ?? null}
    >
      <div className="pagina-de-trabalho">
        <div className="miolo" style={{ maxWidth: 720 }}>
          <div className="linha-topo">
            <h1 style={{ marginTop: 0 }}>{firma.nome}</h1>
            <Link className="botao secundario" href={casa}>
              Voltar
            </Link>
          </div>
          {erro !== undefined && <p className="erro">{erro}</p>}
          <p className="subtitulo">
            É assim que o escritório aparece para quem procura no aplicativo.
          </p>

          <div className="cartao">
            <div className="linha-topo">
              <span className="avatar" aria-hidden>
                {firma.avatarUrl !== null ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={firma.avatarUrl} alt="" />
                ) : (
                  firma.iniciais
                )}
              </span>
              <span className="selo dourado">
                {firma.avaliacoes > 0
                  ? `${estrelas(firma.nota)} ${firma.nota.toFixed(1)} (${firma.avaliacoes})`
                  : "Sem avaliações ainda"}
              </span>
            </div>

            {firma.descricao !== "" && (
              <p style={{ marginBottom: 0 }}>{firma.descricao}</p>
            )}

            <p className="detalhe">
              {firma.areas.length > 0
                ? firma.areas.join(" · ")
                : firma.especialidade}
            </p>
          </div>

          {(firma.endereco !== null ||
            telefone !== null ||
            email !== null ||
            site !== null) && (
            <>
              <h2 className="secao">Contato e endereço</h2>
              <div className="cartao">
                {firma.endereco !== null && (
                  <p style={{ margin: 0 }}>{firma.endereco}</p>
                )}
                {telefone !== null && (
                  <p className="detalhe">Telefone: {telefone}</p>
                )}
                {email !== null && <p className="detalhe">E-mail: {email}</p>}
                {site !== null && (
                  <p className="detalhe">
                    <a href={site} target="_blank" rel="noreferrer">
                      {site}
                    </a>
                  </p>
                )}
              </div>
            </>
          )}

          {dias.length > 0 && (
            <>
              <h2 className="secao">Horário de atendimento</h2>
              <div className="cartao">
                {dias.map((dia) => (
                  <p
                    key={dia.dia}
                    className="detalhe"
                    style={{ margin: "2px 0" }}
                  >
                    <strong>{dia.dia}:</strong> {dia.horarios}
                  </p>
                ))}
              </div>
            </>
          )}

          <AvaliacoesDoProfissional
            supabase={contexto.supabase}
            tipo="law_firm"
            id={id}
            voltar={voltar}
          />
        </div>
      </div>
    </CascaDeTrabalho>
  );
}
