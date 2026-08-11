import { Casca } from "@/components/casca";
import { CartaoDeProfissional } from "@/components/cartao-de-profissional";
import { contextoLogado } from "@/lib/contexto";
import {
  advogadoDaLinha,
  escritorioDaLinha,
} from "@/lib/dominio/descoberta";

export const dynamic = "force-dynamic";

export default async function PaginaInicial({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; erro?: string }>;
}) {
  const { q, erro } = await searchParams;
  const contexto = await contextoLogado();
  const busca = (q ?? "").trim();
  const voltar = busca === "" ? "/inicio" : `/inicio?q=${encodeURIComponent(busca)}`;

  // As MESMAS RPCs da home do app. O termo vai cru para o servidor, que
  // expande a intenção ("meu chefe não me paga" acha trabalhista) pela
  // legal_search_intents; nada de filtrar só o que está na tela. Os
  // corações nascem de fetch_favorite_ids, a mesma consulta única do app.
  const [advogados, escritorios, favoritos] = await Promise.all([
    contexto.supabase.rpc("fetch_recommended_lawyers", {
      limit_value: 6,
      search_value: busca === "" ? null : busca,
      offset_value: 0,
    }),
    contexto.supabase.rpc("fetch_recommended_law_firms", {
      limit_value: 6,
      search_value: busca === "" ? null : busca,
      offset_value: 0,
    }),
    contexto.supabase.rpc("fetch_favorite_ids"),
  ]);

  const listaDeAdvogados = ((advogados.data as unknown[]) ?? []).map((linha) =>
    advogadoDaLinha(linha as Record<string, unknown>),
  );
  const listaDeEscritorios = ((escritorios.data as unknown[]) ?? []).map(
    (linha) => escritorioDaLinha(linha as Record<string, unknown>),
  );
  const chavesDeFavorito = new Set(
    (((favoritos.data as unknown[]) ?? []) as Record<string, unknown>[]).map(
      (linha) => `${linha.target_type}:${linha.target_id}`,
    ),
  );

  return (
    <Casca fluxo="cliente" fluxos={contexto.fluxos} caminhoAtivo="/inicio">
      <h1>Como podemos ajudar hoje?</h1>
      <p className="subtitulo">
        Descreva seu problema e encontre quem resolve.
      </p>

      <form className="formulario-de-busca" method="get" action="/inicio">
        <input
          type="search"
          name="q"
          defaultValue={busca}
          placeholder={'Ex.: "meu chefe não me paga"'}
          aria-label="Descreva seu problema jurídico"
        />
        <button type="submit">Buscar</button>
      </form>

      {erro !== undefined && <p className="erro">{erro}</p>}

      <h2 className="secao">Advogados recomendados</h2>
      {listaDeAdvogados.length === 0 ? (
        <p className="vazio">
          Nenhum advogado encontrado para essa busca. Tente outras palavras.
        </p>
      ) : (
        <div className="grade-dupla">
          {listaDeAdvogados.map((advogado) => (
            <CartaoDeProfissional
              key={advogado.id}
              tipo="lawyer"
              id={advogado.id}
              href={`/profissionais/${advogado.id}`}
              nome={advogado.nome}
              iniciais={advogado.iniciais}
              avatarUrl={advogado.avatarUrl}
              linha1={advogado.areaPrincipal}
              linha2={
                advogado.avaliacoes > 0
                  ? `${advogado.nota.toFixed(1)} (${advogado.avaliacoes} ${
                      advogado.avaliacoes === 1 ? "avaliação" : "avaliações"
                    })`
                  : "Sem avaliações ainda"
              }
              selo={advogado.patrocinado ? "Patrocinado" : undefined}
              favorito={chavesDeFavorito.has(`lawyer:${advogado.id}`)}
              voltar={voltar}
            />
          ))}
        </div>
      )}

      <h2 className="secao">Escritórios recomendados</h2>
      {listaDeEscritorios.length === 0 ? (
        <p className="vazio">
          Nenhum escritório encontrado para essa busca. Tente outras palavras.
        </p>
      ) : (
        <div className="grade-dupla">
          {listaDeEscritorios.map((escritorio) => (
            <CartaoDeProfissional
              key={escritorio.id}
              tipo="law_firm"
              id={escritorio.id}
              href={`/escritorios/${escritorio.id}`}
              nome={escritorio.nome}
              iniciais={escritorio.iniciais}
              avatarUrl={escritorio.avatarUrl}
              linha1={escritorio.especialidade}
              linha2={escritorio.endereco ?? "Atendimento on-line"}
              favorito={chavesDeFavorito.has(`law_firm:${escritorio.id}`)}
              voltar={voltar}
            />
          ))}
        </div>
      )}
    </Casca>
  );
}
