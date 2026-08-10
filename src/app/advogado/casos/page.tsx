import { Casca } from "@/components/casca";
import { contextoLogado, exigeAdvogado } from "@/lib/contexto";
import { casoDoAdvogadoDaLinha } from "@/lib/dominio/casos";

export const dynamic = "force-dynamic";

const rotuloDeStatus = {
  updated: "Atualizado",
  new_message: "Nova mensagem",
  closed: "Encerrado",
} as const;

export default async function PaginaDeCasosDoAdvogado() {
  const contexto = await contextoLogado();
  exigeAdvogado(contexto);

  const { data } = await contexto.supabase.rpc("fetch_lawyer_cases");
  const casos = ((data as unknown[]) ?? []).map((linha) =>
    casoDoAdvogadoDaLinha(linha as Record<string, unknown>),
  );

  return (
    <Casca
      fluxo="advogado"
      fluxos={contexto.fluxos}
      caminhoAtivo="/advogado/casos"
    >
      <h1>Casos</h1>
      <p className="subtitulo">
        O caso nasce na conversa: proponha pelo chat e o cliente aceita.
      </p>

      {casos.length === 0 ? (
        <p className="vazio">
          Nenhum caso ativo. Abra a conversa com o cliente para propor um.
        </p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {casos.map((caso) => (
            <div key={caso.id} className="cartao-de-lista">
              <span className="avatar" aria-hidden>
                {caso.iniciaisDoCliente}
              </span>
              <span className="conteudo">
                <span className="titulo">{caso.titulo}</span>
                <p className="linha-2">
                  {caso.cliente} · {caso.area}
                </p>
                {caso.cnj !== null && (
                  <p className="linha-2">Processo {caso.cnj}</p>
                )}
              </span>
              <span
                className={
                  caso.status === "new_message" ? "selo dourado" : "selo"
                }
              >
                {rotuloDeStatus[caso.status]}
              </span>
            </div>
          ))}
        </div>
      )}
    </Casca>
  );
}
