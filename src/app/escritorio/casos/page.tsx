import { Casca } from "@/components/casca";
import { contextoLogado, exigeEscritorio } from "@/lib/contexto";
import { casoDoEscritorioDaLinha } from "@/lib/dominio/casos";

export const dynamic = "force-dynamic";

export default async function PaginaDeCasosDoEscritorio() {
  const contexto = await contextoLogado();
  const escritorio = exigeEscritorio(contexto);

  const { data } = await contexto.supabase.rpc("fetch_law_firm_cases", {
    law_firm_id_value: escritorio.id,
  });

  const casos = ((data as unknown[]) ?? []).map((linha) =>
    casoDoEscritorioDaLinha(linha as Record<string, unknown>),
  );

  return (
    <Casca
      fluxo="escritorio"
      fluxos={contexto.fluxos}
      caminhoAtivo="/escritorio/casos"
    >
      <h1>Casos</h1>
      <p className="subtitulo">
        Visão geral dos casos por cliente e advogado responsável.
      </p>

      {casos.length === 0 ? (
        <p className="vazio">
          Quando um cliente aceitar um caso do escritório, ele aparece aqui.
        </p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {casos.map((caso) => (
            <div key={caso.id} className="cartao-de-lista">
              <span className="avatar" aria-hidden>
                {caso.iniciaisDoCliente}
              </span>
              <span className="conteudo">
                <span className="titulo">
                  {caso.titulo}
                  {caso.urgente && (
                    <span className="selo dourado">Aguardando resposta</span>
                  )}
                </span>
                <p className="linha-2">
                  {caso.cliente} · {caso.area}
                </p>
                <p className="linha-2">
                  {caso.advogadoId === null
                    ? "Sem advogado definido"
                    : caso.advogado}
                  {caso.proximoPasso !== "" ? ` · ${caso.proximoPasso}` : ""}
                </p>
              </span>
              <span className="selo">{caso.statusRotulo}</span>
            </div>
          ))}
        </div>
      )}
    </Casca>
  );
}
