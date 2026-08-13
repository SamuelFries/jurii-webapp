import Link from "next/link";
import { redirect } from "next/navigation";

import { HistoricoDeRevisao } from "@/components/historico-de-revisao";
import { contextoLogado } from "@/lib/contexto";
import { destinoInicial } from "@/lib/fluxos";
import {
  type DocumentoParaRevisar,
  type FichaDecidida,
} from "@/lib/dominio/revisao";

export const dynamic = "force-dynamic";

const POR_PAGINA = 25;

/**
 * O histórico: tudo que já foi aprovado ou recusado.
 *
 * PAGINADO desde o primeiro dia porque, ao contrário da fila, isto só
 * cresce: em um ano de operação, uma página sem teto viraria a tela que
 * ninguém abre. Vinte e cinco por vez, com o total vindo de uma contagem
 * separada para saber se há próxima sem baixar a lista inteira.
 */
export default async function HistoricoDaRevisao({
  searchParams,
}: {
  searchParams: Promise<{ p?: string }>;
}) {
  const { p } = await searchParams;
  const contexto = await contextoLogado();
  if (!contexto.fluxos.equipeJurii) redirect(destinoInicial(contexto.fluxos));

  const pagina = Math.max(1, Number.parseInt(p ?? "1", 10) || 1);
  const [{ data, error }, { data: total }] = await Promise.all([
    contexto.supabase.rpc("fetch_reviewed_verifications", {
      limit_value: POR_PAGINA,
      offset_value: (pagina - 1) * POR_PAGINA,
    }),
    contexto.supabase.rpc("count_reviewed_verifications"),
  ]);

  const linhas = ((data as unknown[]) ?? []) as Record<string, unknown>[];
  const decididas = Number(total ?? 0);
  const paginas = Math.max(1, Math.ceil(decididas / POR_PAGINA));

  const fichas: FichaDecidida[] = linhas.map((linha) => ({
    id: String(linha.id),
    tipo: linha.kind === "law_firm" ? "law_firm" : "lawyer",
    titulo: String(linha.title ?? ""),
    detalhe: String(linha.detail ?? ""),
    pessoa: String(linha.person_name ?? "Sem nome"),
    email: linha.person_email == null ? null : String(linha.person_email),
    enviadaEmIso:
      linha.submitted_at == null ? null : String(linha.submitted_at),
    documentos: (linha.documents ?? []) as DocumentoParaRevisar[],
    decisao: linha.status === "rejected" ? "rejected" : "approved",
    decididaEmIso: linha.reviewed_at == null ? null : String(linha.reviewed_at),
    revisor: linha.reviewer_name == null ? null : String(linha.reviewer_name),
    motivo:
      linha.rejection_reason == null ? null : String(linha.rejection_reason),
  }));

  return (
    <div className="pagina-de-trabalho">
      <div className="miolo painel-de-revisao">
        <h1 style={{ marginTop: 0 }}>Histórico</h1>
        <p className="subtitulo">
          {decididas === 0
            ? "Nada decidido ainda."
            : `${decididas === 1 ? "1 verificação decidida" : `${decididas} verificações decididas`}. A mais recente primeiro.`}
        </p>

        {error && (
          <p className="erro">Não foi possível carregar o histórico agora.</p>
        )}

        <HistoricoDeRevisao fichas={fichas} />

        {paginas > 1 && (
          <nav className="paginas-do-historico" aria-label="Páginas">
            {pagina > 1 && (
              <Link
                className="botao secundario compacto"
                href={pagina === 2 ? "/revisao/historico" : `/revisao/historico?p=${pagina - 1}`}
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
                href={`/revisao/historico?p=${pagina + 1}`}
              >
                Próximas
              </Link>
            )}
          </nav>
        )}
      </div>
    </div>
  );
}
