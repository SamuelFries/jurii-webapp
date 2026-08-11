import { Casca } from "@/components/casca";
import { CartaoDeProfissional } from "@/components/cartao-de-profissional";
import { contextoLogado } from "@/lib/contexto";
import {
  advogadoDaLinha,
  escritorioDaLinha,
} from "@/lib/dominio/descoberta";

export const dynamic = "force-dynamic";

export default async function PaginaDeFavoritos() {
  const contexto = await contextoLogado();

  const [advogados, escritorios] = await Promise.all([
    contexto.supabase.rpc("fetch_favorite_lawyers"),
    contexto.supabase.rpc("fetch_favorite_law_firms"),
  ]);

  const listaDeAdvogados = ((advogados.data as unknown[]) ?? []).map((linha) =>
    advogadoDaLinha(linha as Record<string, unknown>),
  );
  const listaDeEscritorios = ((escritorios.data as unknown[]) ?? []).map(
    (linha) => escritorioDaLinha(linha as Record<string, unknown>),
  );
  const vazio =
    listaDeAdvogados.length === 0 && listaDeEscritorios.length === 0;

  return (
    <Casca fluxo="cliente" fluxos={contexto.fluxos} caminhoAtivo="/favoritos">
      <h1>Favoritos</h1>
      <p className="subtitulo">
        Quem você guardou para achar rápido depois.
      </p>

      {vazio && (
        <p className="vazio">
          Nenhum favorito ainda. Toque no coração de um advogado ou
          escritório no Início.
        </p>
      )}

      {listaDeAdvogados.length > 0 && (
        <>
          <h2 className="secao">Advogados</h2>
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
                favorito
                voltar="/favoritos"
              />
            ))}
          </div>
        </>
      )}

      {listaDeEscritorios.length > 0 && (
        <>
          <h2 className="secao">Escritórios</h2>
          <div className="grade-dupla">
            {listaDeEscritorios.map((escritorio) => (
              <CartaoDeProfissional
                key={escritorio.id}
                tipo="law_firm"
                id={escritorio.id}
                nome={escritorio.nome}
                iniciais={escritorio.iniciais}
                avatarUrl={escritorio.avatarUrl}
                linha1={escritorio.especialidade}
                linha2={escritorio.endereco ?? "Atendimento on-line"}
                favorito
                voltar="/favoritos"
              />
            ))}
          </div>
        </>
      )}
    </Casca>
  );
}
