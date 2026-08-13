"use client";

import { useState } from "react";

import { assinaDocumentos, decidirVerificacao } from "@/app/revisao/acoes";
import {
  diasDeEspera,
  documentosQueFaltam,
  esperaDesde,
  rotuloDoDocumento,
  type FichaParaRevisar,
  type UrlsDoDocumento,
} from "@/lib/dominio/revisao";

/**
 * A fila de revisão.
 *
 * DUAS DECISÕES, e as duas vêm da mesma observação: quem revisa não navega
 * um painel, processa uma pilha.
 *
 * 1. AS IMAGENS SÓ BAIXAM AO ABRIR. Antes, o painel carregava TODOS os
 *    documentos de TODAS as fichas de uma vez: com 6 pessoas na fila, 18
 *    arquivos e megabytes antes de a primeira decisão ser possível. Aqui o
 *    `src` só existe depois do clique, então fechado custa zero byte.
 *
 * 2. UMA ABERTA POR VEZ. Não é só estética: além de manter o foco na ficha
 *    que está sendo decidida, garante que o navegador nunca segure mais do
 *    que um conjunto de documentos.
 *
 * A linha fechada carrega o que decide a ORDEM do trabalho: quem é, há
 * quanto tempo espera, e se chegou completa. Fila em que tudo parece igual
 * obriga a abrir uma a uma só para descobrir o que priorizar.
 */
export function FilaDeRevisao({
  fichas,
  agoraIso,
}: {
  fichas: FichaParaRevisar[];
  agoraIso: string;
}) {
  const [aberta, setAberta] = useState<string | null>(null);
  const [recusando, setRecusando] = useState<string | null>(null);
  // As URLs vivem aqui porque só existem depois do clique: a página carrega
  // sem tocar no storage.
  const [urls, setUrls] = useState<Record<string, UrlsDoDocumento>>({});
  const [buscando, setBuscando] = useState(false);

  async function abrir(ficha: FichaParaRevisar) {
    setAberta(ficha.id);
    setRecusando(null);
    const faltando = ficha.documentos.filter(
      (doc) => urls[doc.caminho] === undefined,
    );
    if (faltando.length === 0) return;
    setBuscando(true);
    const novas = await assinaDocumentos(
      faltando.map((doc) => ({ bucket: doc.bucket, caminho: doc.caminho })),
    );
    setUrls((atuais) => ({ ...atuais, ...novas }));
    setBuscando(false);
  }
  const agora = new Date(agoraIso);

  if (fichas.length === 0) {
    return (
      <p className="vazio">
        Nada na fila. Quando alguém enviar verificação de OAB ou pedido de
        escritório, aparece aqui.
      </p>
    );
  }

  return (
    <div className="fila-de-revisao">
      {fichas.map((ficha) => {
        const estaAberta = aberta === ficha.id;
        const faltam = documentosQueFaltam(ficha);
        const dias = diasDeEspera(ficha.enviadaEmIso, agora);

        return (
          <article
            key={ficha.id}
            className={estaAberta ? "ficha aberta" : "ficha"}
          >
            <button
              type="button"
              className="linha-da-fila"
              aria-expanded={estaAberta}
              onClick={() => {
                if (estaAberta) {
                  setAberta(null);
                  setRecusando(null);
                  return;
                }
                void abrir(ficha);
              }}
            >
              <span className={ficha.tipo === "law_firm" ? "selo roxo" : "selo"}>
                {ficha.tipo === "law_firm" ? "Escritório" : "Advogado"}
              </span>
              <span className="identidade">
                <strong>{ficha.pessoa}</strong>
                <span className="detalhe">
                  {ficha.titulo} · {ficha.detalhe}
                </span>
              </span>
              <span className="sinais">
                {faltam.length > 0 ? (
                  <span className="selo faltando">
                    {faltam.length === 1
                      ? "falta 1 documento"
                      : `faltam ${faltam.length} documentos`}
                  </span>
                ) : (
                  <span className="detalhe">
                    {ficha.documentos.length} documentos
                  </span>
                )}
                {/* Envelhecida ganha destaque: fila em que tudo parece
                    igual esconde quem está esperando desde a semana
                    passada. */}
                <span
                  className={
                    dias !== null && dias >= 2 ? "espera envelhecida" : "espera"
                  }
                >
                  {esperaDesde(ficha.enviadaEmIso, agora)}
                </span>
                <span className="seta" aria-hidden>
                  {estaAberta ? "▲" : "▼"}
                </span>
              </span>
            </button>

            {estaAberta && (
              <div className="corpo-da-ficha">
                {ficha.email !== null && (
                  <p className="detalhe">{ficha.email}</p>
                )}

                {ficha.documentos.length === 0 ? (
                  <p className="erro">
                    Esta submissão chegou sem documento. Recuse pedindo o
                    reenvio.
                  </p>
                ) : (
                  <div className="documentos-da-revisao">
                    {ficha.documentos.map((doc) => {
                      const par = urls[doc.caminho];
                      return (
                        <figure key={doc.caminho}>
                          <figcaption>
                            {rotuloDoDocumento[doc.tipo] ?? doc.titulo}
                          </figcaption>
                          {par === undefined ? (
                            <div
                              className="esqueleto"
                              style={{ height: 190, borderRadius: 8 }}
                              aria-label={
                                buscando ? "Carregando documento" : "Documento"
                              }
                            />
                          ) : /\.pdf($|\?)/i.test(doc.caminho) ? (
                            <a
                              className="botao secundario compacto"
                              href={par.original}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Abrir PDF
                            </a>
                          ) : (
                            // A tela mostra a MINIATURA; o clique abre o
                            // original. Medido em produção: 1978 KB viram
                            // 141 KB, e assinar OAB por miniatura seria
                            // adivinhação, por isso o original no clique.
                            <a
                              href={par.original}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={par.miniatura}
                                alt={doc.titulo}
                                loading="lazy"
                                decoding="async"
                              />
                            </a>
                          )}
                        </figure>
                      );
                    })}
                  </div>
                )}

                {faltam.length > 0 && ficha.documentos.length > 0 && (
                  <p className="erro">
                    Faltou:{" "}
                    {faltam
                      .map((tipo) => rotuloDoDocumento[tipo] ?? tipo)
                      .join(", ")}
                    .
                  </p>
                )}

                <div className="decisao-da-revisao">
                  <form action={decidirVerificacao}>
                    <input type="hidden" name="tipo" value={ficha.tipo} />
                    <input type="hidden" name="id" value={ficha.id} />
                    <input type="hidden" name="decisao" value="aprovar" />
                    <button type="submit">Aprovar</button>
                  </form>

                  {recusando === ficha.id ? (
                    <form action={decidirVerificacao} className="forma-de-recusa">
                      <input type="hidden" name="tipo" value={ficha.tipo} />
                      <input type="hidden" name="id" value={ficha.id} />
                      <input type="hidden" name="decisao" value="recusar" />
                      <label htmlFor={`motivo-${ficha.id}`}>
                        Motivo (a pessoa vai ler isto)
                      </label>
                      <textarea
                        id={`motivo-${ficha.id}`}
                        name="motivo"
                        rows={2}
                        required
                        autoFocus
                        placeholder="Ex.: a foto da carteira da OAB está ilegível. Reenvie com o número visível."
                      />
                      <div className="acoes-em-linha">
                        <button
                          type="submit"
                          className="discreto"
                          style={{ color: "var(--danger)" }}
                        >
                          Recusar e enviar o motivo
                        </button>
                        <button
                          type="button"
                          className="discreto"
                          onClick={() => setRecusando(null)}
                        >
                          Cancelar
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button
                      type="button"
                      className="secundario"
                      onClick={() => setRecusando(ficha.id)}
                    >
                      Recusar
                    </button>
                  )}
                </div>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
