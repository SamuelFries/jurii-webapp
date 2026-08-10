import Link from "next/link";

import { Casca } from "@/components/casca";
import { contextoLogado } from "@/lib/contexto";
import {
  casoDoClienteDaLinha,
  solicitacaoDaLinha,
} from "@/lib/dominio/casos";

import { responderSolicitacao } from "./acoes";

export const dynamic = "force-dynamic";

export default async function PaginaDeCasosDoCliente({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  const contexto = await contextoLogado();

  const [casos, solicitacoes] = await Promise.all([
    contexto.supabase.rpc("fetch_client_cases"),
    contexto.supabase.rpc("fetch_case_requests_for_client"),
  ]);

  const listaDeCasos = ((casos.data as unknown[]) ?? []).map((linha) =>
    casoDoClienteDaLinha(linha as Record<string, unknown>),
  );
  const listaDeSolicitacoes = ((solicitacoes.data as unknown[]) ?? []).map(
    (linha) => solicitacaoDaLinha(linha as Record<string, unknown>),
  );

  return (
    <Casca fluxo="cliente" fluxos={contexto.fluxos} caminhoAtivo="/casos">
      <h1>Meus casos</h1>
      <p className="subtitulo">Acompanhe aqui seus atendimentos jurídicos.</p>

      {erro !== undefined && <p className="erro">{erro}</p>}

      {listaDeSolicitacoes.length > 0 && (
        <>
          <h2 className="secao">Solicitações pendentes</h2>
          <div style={{ display: "grid", gap: 12 }}>
            {listaDeSolicitacoes.map((solicitacao) => (
              <div key={solicitacao.id} className="cartao">
                <div className="linha-topo">
                  <strong>{solicitacao.titulo}</strong>
                  <span className="selo">{solicitacao.area}</span>
                </div>
                <p className="detalhe">
                  Proposto por {solicitacao.solicitadoPor}
                </p>
                {solicitacao.resumo !== "" && (
                  <p className="detalhe">{solicitacao.resumo}</p>
                )}
                <div className="acoes-em-linha">
                  <form action={responderSolicitacao}>
                    <input type="hidden" name="id" value={solicitacao.id} />
                    <input type="hidden" name="aceitar" value="nao" />
                    <button type="submit" className="secundario">
                      Recusar
                    </button>
                  </form>
                  <form action={responderSolicitacao}>
                    <input type="hidden" name="id" value={solicitacao.id} />
                    <input type="hidden" name="aceitar" value="sim" />
                    <button type="submit">Aceitar caso</button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <h2 className="secao">Casos em andamento</h2>
      {listaDeCasos.length === 0 ? (
        <p className="vazio">
          Quando um advogado propuser um caso na conversa e você aceitar, ele
          aparece aqui.
        </p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {listaDeCasos.map((caso) => (
            <Link
              key={caso.id}
              href={`/casos/${caso.id}`}
              className="cartao-de-lista"
            >
              <span className="conteudo">
                <span className="titulo">{caso.titulo}</span>
                <p className="linha-2">
                  {caso.area}
                  {caso.atualizadoEm !== "" ? ` · ${caso.atualizadoEm}` : ""}
                </p>
                {caso.cnj !== null && (
                  <p className="linha-2">Processo {caso.cnj}</p>
                )}
              </span>
              <span className="selo">{caso.status}</span>
            </Link>
          ))}
        </div>
      )}
    </Casca>
  );
}
