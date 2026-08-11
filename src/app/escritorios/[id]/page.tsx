import Link from "next/link";

import { alternarFavorito } from "@/app/favoritos/acoes";
import { conversarComEscritorio } from "@/app/inicio/acoes";
import { Casca } from "@/components/casca";
import { contextoLogado } from "@/lib/contexto";
import { avaliacaoDaLinha, estrelas } from "@/lib/dominio/avaliacoes";
import { escritorioDaLinha } from "@/lib/dominio/descoberta";
import { agrupaPorDia, intervaloDaLinha } from "@/lib/dominio/horarios";
import { rotuloDeHorario } from "@/lib/dominio/conversas";

import { apagarAvaliacao, enviarAvaliacao } from "./acoes";

export const dynamic = "force-dynamic";

/**
 * O perfil público do escritório, espelho do LawFirmProfileScreen do app:
 * apresentação, contato, endereço, horário de atendimento, áreas e
 * avaliações (com enviar e apagar, elegibilidade decidida pelo servidor).
 * Tudo leitura já pública pela RLS: law_firms_public_read, horários com
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

  const [firmaRes, horariosRes, avaliacoesRes, elegibilidadeRes, favoritosRes] =
    await Promise.all([
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
      contexto.supabase.rpc("fetch_professional_reviews", {
        target_type_value: "law_firm",
        target_id_value: id,
        limit_value: 20,
      }),
      contexto.supabase.rpc("fetch_review_eligibility", {
        target_type_value: "law_firm",
        target_id_value: id,
      }),
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
  const avaliacoes = (((avaliacoesRes.data as unknown[]) ?? []) as Record<
    string,
    unknown
  >[]).map(avaliacaoDaLinha);
  const elegibilidade = ((elegibilidadeRes.data as unknown[]) ?? [])[0] as
    | Record<string, unknown>
    | undefined;
  const podeAvaliar = elegibilidade?.can_review === true;
  const minhaNota =
    elegibilidade?.my_rating == null ? null : Number(elegibilidade.my_rating);
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

  const agora = new Date();

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

      {(firma.endereco !== null || telefone !== null || email !== null || site !== null) && (
        <>
          <h2 className="secao">Contato e endereço</h2>
          <div className="cartao">
            {firma.endereco !== null && <p style={{ margin: 0 }}>{firma.endereco}</p>}
            {telefone !== null && <p className="detalhe">Telefone: {telefone}</p>}
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

      <h2 className="secao">Avaliações</h2>
      {podeAvaliar && (
        <div className="cartao">
          <strong>
            {minhaNota === null ? "Avalie o atendimento" : "Atualize sua avaliação"}
          </strong>
          <form action={enviarAvaliacao}>
            <input type="hidden" name="tipo" value="law_firm" />
            <input type="hidden" name="id" value={firma.id} />
            <input type="hidden" name="voltar" value={voltar} />
            <label htmlFor="nota">Nota</label>
            <select
              id="nota"
              name="nota"
              className="seletor"
              defaultValue={minhaNota === null ? "" : String(minhaNota)}
              required
            >
              <option value="" disabled>
                Escolha de 1 a 5
              </option>
              {[5, 4, 3, 2, 1].map((valor) => (
                <option key={valor} value={valor}>
                  {estrelas(valor)} ({valor})
                </option>
              ))}
            </select>
            <label htmlFor="comentario">Comentário (opcional)</label>
            <textarea id="comentario" name="comentario" rows={3} />
            <button type="submit">Enviar avaliação</button>
          </form>
        </div>
      )}

      {avaliacoes.length === 0 ? (
        <p className="vazio">Nenhuma avaliação ainda.</p>
      ) : (
        <div className="lista-empilhada">
          {avaliacoes.map((avaliacao) => (
            <div key={avaliacao.id} className="cartao-de-lista">
              <span className="avatar" aria-hidden>
                {avaliacao.iniciais}
              </span>
              <span className="conteudo">
                <span className="titulo">
                  {avaliacao.autor}
                  {avaliacao.minha && <span className="selo">Sua avaliação</span>}
                </span>
                <p className="linha-2">
                  {estrelas(avaliacao.nota)}
                  {avaliacao.criadaEm !== null
                    ? ` · ${rotuloDeHorario(avaliacao.criadaEm, agora)}`
                    : ""}
                </p>
                {avaliacao.comentario !== "" && (
                  <p className="linha-2">{avaliacao.comentario}</p>
                )}
                {avaliacao.minha && (
                  <form action={apagarAvaliacao}>
                    <input type="hidden" name="tipo" value="law_firm" />
                    <input type="hidden" name="id" value={firma.id} />
                    <input type="hidden" name="voltar" value={voltar} />
                    <button type="submit" className="discreto">
                      Apagar minha avaliação
                    </button>
                  </form>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </Casca>
  );
}
