import { Casca } from "@/components/casca";
import { contextoLogado } from "@/lib/contexto";
import {
  advogadoDaLinha,
  escritorioDaLinha,
} from "@/lib/dominio/descoberta";

import { conversarComAdvogado, conversarComEscritorio } from "./acoes";

export const dynamic = "force-dynamic";

export default async function PaginaInicial({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; erro?: string }>;
}) {
  const { q, erro } = await searchParams;
  const contexto = await contextoLogado();
  const busca = (q ?? "").trim();

  // As MESMAS RPCs da home do app. O termo vai cru para o servidor, que
  // expande a intenção ("meu chefe não me paga" acha trabalhista) pela
  // legal_search_intents; nada de filtrar só o que está na tela.
  const [advogados, escritorios] = await Promise.all([
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
  ]);

  const listaDeAdvogados = ((advogados.data as unknown[]) ?? []).map((linha) =>
    advogadoDaLinha(linha as Record<string, unknown>),
  );
  const listaDeEscritorios = ((escritorios.data as unknown[]) ?? []).map(
    (linha) => escritorioDaLinha(linha as Record<string, unknown>),
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
            <div key={advogado.id} className="cartao-de-lista">
              <span className="avatar" aria-hidden>
                {advogado.avatarUrl !== null ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={advogado.avatarUrl} alt="" />
                ) : (
                  advogado.iniciais
                )}
              </span>
              <span className="conteudo">
                <span className="titulo">
                  {advogado.nome}
                  {advogado.patrocinado && (
                    <span className="selo dourado">Patrocinado</span>
                  )}
                </span>
                <p className="linha-2">{advogado.areaPrincipal}</p>
                <p className="linha-2">
                  {advogado.avaliacoes > 0
                    ? `${advogado.nota.toFixed(1)} (${advogado.avaliacoes} ${
                        advogado.avaliacoes === 1 ? "avaliação" : "avaliações"
                      })`
                    : "Sem avaliações ainda"}
                </p>
                <form action={conversarComAdvogado}>
                  <input type="hidden" name="id" value={advogado.id} />
                  <button type="submit" className="secundario">
                    Conversar
                  </button>
                </form>
              </span>
            </div>
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
            <div key={escritorio.id} className="cartao-de-lista">
              <span className="avatar" aria-hidden>
                {escritorio.avatarUrl !== null ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={escritorio.avatarUrl} alt="" />
                ) : (
                  escritorio.iniciais
                )}
              </span>
              <span className="conteudo">
                <span className="titulo">{escritorio.nome}</span>
                <p className="linha-2">{escritorio.especialidade}</p>
                <p className="linha-2">
                  {escritorio.endereco ?? "Atendimento on-line"}
                </p>
                <form action={conversarComEscritorio}>
                  <input type="hidden" name="id" value={escritorio.id} />
                  <button type="submit" className="secundario">
                    Conversar
                  </button>
                </form>
              </span>
            </div>
          ))}
        </div>
      )}
    </Casca>
  );
}
