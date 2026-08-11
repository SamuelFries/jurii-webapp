import Link from "next/link";

import { alternarFavorito } from "@/app/favoritos/acoes";
import { conversarComEscritorio } from "@/app/inicio/acoes";
import { AvaliacoesDoProfissional } from "@/components/avaliacoes-do-profissional";
import { Casca } from "@/components/casca";
import { contextoLogado } from "@/lib/contexto";
import { estrelas } from "@/lib/dominio/avaliacoes";
import { escritorioDaLinha } from "@/lib/dominio/descoberta";
import { agrupaPorDia, intervaloDaLinha } from "@/lib/dominio/horarios";

export const dynamic = "force-dynamic";

/**
 * O perfil público do escritório, espelho do LawFirmProfileScreen do app:
 * apresentação, contato, endereço, horário de atendimento, áreas e
 * avaliações (componente compartilhado com o perfil do advogado). Tudo
 * leitura já pública pela RLS: law_firms_public_read, horários com
 * using(true), avaliações por RPC.
 */
export default async function PaginaDoEscritorio({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { id } = await params;
  const { erro } = await searchParams;
  const contexto = await contextoLogado();
  const voltar = `/escritorios/${id}`;

  const [firmaRes, horariosRes, favoritosRes] = await Promise.all([
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
    contexto.supabase.rpc("fetch_favorite_ids"),
  ]);

  if (firmaRes.data == null) {
    return (
      <Casca fluxo="cliente" fluxos={contexto.fluxos} caminhoAtivo="/inicio">
        <p className="vazio">
          Este escritório não está mais disponível no Jurii.
        </p>
        <Link className="botao secundario" href="/inicio">
          Voltar para o Início
        </Link>
      </Casca>
    );
  }

  const firma = escritorioDaLinha(firmaRes.data as Record<string, unknown>);
  const dias = agrupaPorDia(
    (((horariosRes.data as unknown[]) ?? []) as Record<string, unknown>[]).map(
      intervaloDaLinha,
    ),
  );
  const favorito = new Set(
    (((favoritosRes.data as unknown[]) ?? []) as Record<string, unknown>[]).map(
      (linha) => `${linha.target_type}:${linha.target_id}`,
    ),
  ).has(`law_firm:${id}`);

  const linhaDoRow = firmaRes.data as Record<string, unknown>;
  const telefone = linhaDoRow.phone == null ? null : String(linhaDoRow.phone);
  const email = linhaDoRow.email == null ? null : String(linhaDoRow.email);
  const site =
    linhaDoRow.website_url == null ? null : String(linhaDoRow.website_url);

  return (
    <Casca fluxo="cliente" fluxos={contexto.fluxos} caminhoAtivo="/inicio">
      <div className="cabecalho-do-chat">
        <Link href="/inicio">← Início</Link>
        <span className="nome">{firma.nome}</span>
        <span className="area">{firma.especialidade}</span>
      </div>

      {erro !== undefined && <p className="erro">{erro}</p>}

      <div className="cartao" style={{ marginTop: 16 }}>
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
          {firma.areas.length > 0 ? firma.areas.join(" · ") : firma.especialidade}
        </p>

        <div className="acoes-em-linha">
          <form action={conversarComEscritorio}>
            <input type="hidden" name="id" value={firma.id} />
            <button type="submit">Conversar</button>
          </form>
          <form action={alternarFavorito} className="forma-do-coracao">
            <input type="hidden" name="tipo" value="law_firm" />
            <input type="hidden" name="id" value={firma.id} />
            <input type="hidden" name="voltar" value={voltar} />
            <button
              type="submit"
              className={favorito ? "coracao ativo" : "coracao"}
              aria-label={
                favorito ? "Remover dos favoritos" : "Adicionar aos favoritos"
              }
            >
              {favorito ? "♥" : "♡"}
            </button>
          </form>
        </div>
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
              <p key={dia.dia} className="detalhe" style={{ margin: "2px 0" }}>
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
    </Casca>
  );
}
