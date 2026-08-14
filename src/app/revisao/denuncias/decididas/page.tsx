import Link from "next/link";
import { redirect } from "next/navigation";

import { FilaDeDenuncias } from "@/components/fila-de-denuncias";
import { contextoLogado } from "@/lib/contexto";
import { denunciaDaLinha } from "@/lib/dominio/denuncias";
import { destinoInicial } from "@/lib/fluxos";

export const dynamic = "force-dynamic";

const POR_PAGINA = 25;

/**
 * O que já foi decidido, paginado pelo mesmo motivo do histórico de
 * verificações: a fila esvazia sozinha, o histórico não.
 *
 * Mora sob /revisao/denuncias e não como item próprio da lateral, porque a
 * pergunta é a mesma feita para trás: quatro itens de menu para duas coisas
 * faria a lateral pesar mais que o painel.
 */
export default async function DenunciasDecididas({
  searchParams,
}: {
  searchParams: Promise<{ p?: string }>;
}) {
  const { p } = await searchParams;
  const contexto = await contextoLogado();
  if (!contexto.fluxos.equipeJurii) redirect(destinoInicial(contexto.fluxos));

  const pagina = Math.max(1, Number.parseInt(p ?? "1", 10) || 1);
  const [{ data, error }, { data: total }] = await Promise.all([
    contexto.supabase.rpc("fetch_reviewed_reports", {
      limit_value: POR_PAGINA,
      offset_value: (pagina - 1) * POR_PAGINA,
    }),
    contexto.supabase.rpc("count_reviewed_reports"),
  ]);

  const denuncias = (((data as unknown[]) ?? []) as Record<string, unknown>[])
    .map(denunciaDaLinha);
  const decididas = Number(total ?? 0);
  const paginas = Math.max(1, Math.ceil(decididas / POR_PAGINA));

  return (
    <div className="pagina-de-trabalho">
      <div className="miolo painel-de-revisao">
        <div className="linha-topo">
          <h1 style={{ marginTop: 0 }}>Denúncias decididas</h1>
          <Link className="botao secundario compacto" href="/revisao/denuncias">
            Ver abertas
          </Link>
        </div>
        <p className="subtitulo">
          {error
            ? "Denúncias já decididas pela equipe."
            : decididas === 0
              ? "Nada decidido ainda."
              : `${decididas === 1 ? "1 denúncia decidida" : `${decididas} denúncias decididas`}. A mais recente primeiro.`}
        </p>

        {error ? (
          <p className="erro">
            Não foi possível carregar o histórico agora. Recarregue a página
            em alguns instantes.
          </p>
        ) : (
          <>
            <FilaDeDenuncias denuncias={denuncias} decidiveis={false} />

            {paginas > 1 && (
              <nav className="paginas-do-historico" aria-label="Páginas">
                {pagina > 1 && (
                  <Link
                    className="botao secundario compacto"
                    href={pagina === 2 ? "/revisao/denuncias/decididas" : `/revisao/denuncias/decididas?p=${pagina - 1}`}
                  >
                    Anteriores
                  </Link>
                )}
                <span className="detalhe">
                  página {pagina} de {paginas}
                </span>
                {pagina < paginas && (
                  <Link
                    className="botao secundario compacto"
                    href={`/revisao/denuncias/decididas?p=${pagina + 1}`}
                  >
                    Próximas
                  </Link>
                )}
              </nav>
            )}
          </>
        )}
      </div>
    </div>
  );
}
