import Link from "next/link";
import { redirect } from "next/navigation";

import { contextoLogado } from "@/lib/contexto";
import { destinoInicial } from "@/lib/fluxos";

import { decidirVerificacao } from "./acoes";

export const dynamic = "force-dynamic";

interface DocumentoDaFila {
  tipo: string;
  titulo: string;
  caminho: string;
  bucket: string;
}

const rotuloDoDocumento: Record<string, string> = {
  identity: "Identificação (RG ou CNH)",
  oab_card: "Carteira da OAB",
  professional_photo: "Foto profissional",
  profile_photo: "Foto do escritório",
};

/**
 * O painel da equipe da Jurii.
 *
 * MORA NO app.jurii.com.br DE PROPÓSITO, e não num subdomínio próprio. A
 * razão é que esta tela NÃO TEM PODER: ela chama review_*_verification com
 * a sessão da própria pessoa, e quem confere se ela é da equipe é o banco
 * (jurii_staff, com RLS sem policy). Um subdomínio separado só isolaria o
 * frontend, e o frontend aqui não guarda nada que valha isolar. Fosse pelo
 * caminho da service_role, a separação seria obrigatória, porque aí o
 * frontend É que teria a chave.
 *
 * O que realmente separaria poder seria a CONTA: no dia em que a revisão
 * for feita por gente de fora, o certo é uma conta só para revisar, e não
 * um endereço diferente para a mesma conta.
 *
 * A TELA É FEITA PARA DECIDIR RÁPIDO: o dado declarado e os documentos
 * lado a lado, porque revisar é comparar um com o outro. Rolar de um para
 * o outro é onde o erro nasce.
 */
export default async function PainelDeRevisao({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  const { ok, erro } = await searchParams;
  const contexto = await contextoLogado();

  const { data: daEquipe } = await contexto.supabase.rpc("is_jurii_staff");
  if (daEquipe !== true) redirect(destinoInicial(contexto.fluxos));

  const { data, error } = await contexto.supabase.rpc(
    "fetch_pending_verifications",
  );
  const fila = ((data as unknown[]) ?? []) as Record<string, unknown>[];

  // Uma assinatura por documento, num lote só: são poucas por página e a
  // URL vale 10 minutos, tempo de análise sem virar link durável.
  const caminhosPorBalde = new Map<string, string[]>();
  for (const linha of fila) {
    for (const doc of (linha.documents ?? []) as DocumentoDaFila[]) {
      const lista = caminhosPorBalde.get(doc.bucket) ?? [];
      lista.push(doc.caminho);
      caminhosPorBalde.set(doc.bucket, lista);
    }
  }
  const urlPorCaminho = new Map<string, string>();
  await Promise.all(
    [...caminhosPorBalde.entries()].map(async ([balde, caminhos]) => {
      const { data: assinadas } = await contexto.supabase.storage
        .from(balde)
        .createSignedUrls(caminhos, 600);
      for (const assinada of assinadas ?? []) {
        if (assinada.signedUrl && assinada.path) {
          urlPorCaminho.set(assinada.path, assinada.signedUrl);
        }
      }
    }),
  );

  return (
    <main className="pagina painel-de-revisao">
      <div className="linha-topo">
        <h1 style={{ margin: 0 }}>Verificações pendentes</h1>
        <Link
          className="botao secundario compacto"
          href={destinoInicial(contexto.fluxos)}
        >
          Sair da revisão
        </Link>
      </div>
      <p className="subtitulo">
        Cada decisão fica registrada com o seu nome. Recusa exige motivo,
        porque é ele que a pessoa lê para corrigir e reenviar.
      </p>

      {erro !== undefined && <p className="erro">{erro}</p>}
      {ok === "aprovada" && <p className="aviso-bom">Verificação aprovada.</p>}
      {ok === "recusada" && (
        <p className="aviso-bom">Verificação recusada, com o motivo enviado.</p>
      )}
      {error && (
        <p className="erro">Não foi possível carregar a fila agora.</p>
      )}

      {fila.length === 0 ? (
        <p className="vazio">
          Nada na fila. Quando alguém enviar verificação de OAB ou pedido de
          escritório, aparece aqui.
        </p>
      ) : (
        fila.map((linha) => {
          const documentos = ((linha.documents ?? []) as DocumentoDaFila[]).map(
            (doc) => ({ ...doc, url: urlPorCaminho.get(doc.caminho) ?? null }),
          );
          const id = String(linha.id);
          const tipo = String(linha.kind);
          const enviadaEm =
            linha.submitted_at == null
              ? null
              : new Date(String(linha.submitted_at)).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                });

          return (
            <article key={id} className="cartao ficha-de-revisao">
              <header>
                <span className={tipo === "law_firm" ? "selo roxo" : "selo"}>
                  {tipo === "law_firm" ? "Escritório" : "Advogado"}
                </span>
                <h2>{String(linha.title ?? "")}</h2>
                <p className="detalhe">
                  {String(linha.person_name ?? "")}
                  {linha.person_email != null &&
                    ` · ${String(linha.person_email)}`}
                </p>
                <p className="detalhe">
                  {String(linha.detail ?? "")}
                  {enviadaEm !== null && ` · enviada em ${enviadaEm}`}
                </p>
              </header>

              {documentos.length === 0 ? (
                <p className="erro">
                  Esta submissão chegou sem documento. Recuse pedindo o reenvio.
                </p>
              ) : (
                <div className="documentos-da-revisao">
                  {documentos.map((doc) => (
                    <figure key={doc.caminho}>
                      <figcaption>
                        {rotuloDoDocumento[doc.tipo] ?? doc.titulo}
                      </figcaption>
                      {doc.url === null ? (
                        <p className="detalhe">Não foi possível abrir.</p>
                      ) : /\.pdf($|\?)/i.test(doc.caminho) ? (
                        <a
                          className="botao secundario compacto"
                          href={doc.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Abrir PDF
                        </a>
                      ) : (
                        // Clicar abre em tamanho real: assinar a carteira da
                        // OAB pela miniatura seria adivinhação.
                        <a href={doc.url} target="_blank" rel="noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={doc.url} alt={doc.titulo} />
                        </a>
                      )}
                    </figure>
                  ))}
                </div>
              )}

              <div className="decisao-da-revisao">
                <form action={decidirVerificacao}>
                  <input type="hidden" name="tipo" value={tipo} />
                  <input type="hidden" name="id" value={id} />
                  <input type="hidden" name="decisao" value="aprovar" />
                  <button type="submit">Aprovar</button>
                </form>

                <details>
                  <summary className="detalhe">Recusar</summary>
                  <form action={decidirVerificacao} style={{ marginTop: 8 }}>
                    <input type="hidden" name="tipo" value={tipo} />
                    <input type="hidden" name="id" value={id} />
                    <input type="hidden" name="decisao" value="recusar" />
                    <label htmlFor={`motivo-${id}`}>
                      Motivo (a pessoa vai ler)
                    </label>
                    <textarea
                      id={`motivo-${id}`}
                      name="motivo"
                      rows={2}
                      required
                      placeholder="Ex.: a foto da carteira da OAB está ilegível. Reenvie com o número visível."
                    />
                    <button
                      type="submit"
                      className="discreto"
                      style={{ color: "var(--danger)" }}
                    >
                      Recusar e enviar o motivo
                    </button>
                  </form>
                </details>
              </div>
            </article>
          );
        })
      )}
    </main>
  );
}
