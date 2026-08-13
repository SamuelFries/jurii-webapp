"use client";

import { useState } from "react";

import { assinaDocumentos } from "@/app/revisao/acoes";
import {
  dataDaDecisao,
  quemDecidiu,
  rotuloDaDecisao,
  rotuloDoDocumento,
  type FichaDecidida,
  type UrlsDoDocumento,
} from "@/lib/dominio/revisao";

/**
 * O histórico do que já foi decidido.
 *
 * Mesma mecânica da fila, e pelo mesmo motivo: os documentos só baixam ao
 * abrir. Aqui isso pesa ainda mais, porque o histórico só cresce, e uma
 * página que baixasse tudo ficaria pior a cada semana de operação.
 *
 * A linha fechada responde as perguntas que se faz a um histórico: quem
 * era, o que foi decidido, quando e por quem. O MOTIVO da recusa fica
 * visível sem abrir, porque é o que costuma estar sendo procurado quando
 * alguém volta aqui.
 */
export function HistoricoDeRevisao({ fichas }: { fichas: FichaDecidida[] }) {
  const [aberta, setAberta] = useState<string | null>(null);
  const [urls, setUrls] = useState<Record<string, UrlsDoDocumento>>({});
  const [buscando, setBuscando] = useState(false);

  async function abrir(ficha: FichaDecidida) {
    setAberta(ficha.id);
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

  if (fichas.length === 0) {
    return (
      <p className="vazio">
        Nada decidido ainda. Quando a equipe aprovar ou recusar uma
        verificação, ela fica registrada aqui.
      </p>
    );
  }

  return (
    <div className="fila-de-revisao">
      {fichas.map((ficha) => {
        const estaAberta = aberta === ficha.id;
        const recusada = ficha.decisao === "rejected";

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
                  return;
                }
                void abrir(ficha);
              }}
            >
              <span
                className={
                  recusada ? "selo decisao recusada" : "selo decisao aprovada"
                }
              >
                {rotuloDaDecisao(ficha.decisao)}
              </span>
              <span className="identidade">
                <strong>{ficha.pessoa}</strong>
                <span className="detalhe">
                  {ficha.tipo === "law_firm" ? "Escritório" : "Advogado"} ·{" "}
                  {ficha.titulo}
                </span>
                {/* O motivo aparece FECHADO: é o que se procura quando se
                    volta ao histórico de uma recusa. */}
                {recusada && ficha.motivo !== null && (
                  <span className="motivo-no-historico">{ficha.motivo}</span>
                )}
              </span>
              <span className="sinais">
                <span className="detalhe alinhado-a-direita">
                  {dataDaDecisao(ficha.decididaEmIso)}
                  <br />
                  por {quemDecidiu(ficha.revisor)}
                </span>
                <span className="seta" aria-hidden>
                  {estaAberta ? "▲" : "▼"}
                </span>
              </span>
            </button>

            {estaAberta && (
              <div className="corpo-da-ficha">
                {ficha.email !== null && (
                  <p className="detalhe">
                    {ficha.email} · {ficha.detalhe}
                  </p>
                )}

                {ficha.documentos.length === 0 ? (
                  <p className="detalhe">
                    Esta verificação não tem documento guardado.
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
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
