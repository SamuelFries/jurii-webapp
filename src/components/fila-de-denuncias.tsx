"use client";

import { useState } from "react";

import { decidirDenuncia } from "@/app/revisao/denuncias/acoes";
import {
  ladoDaMensagem,
  motivoLegivel,
  quandoAconteceu,
  rotuloDaDecisaoDaDenuncia,
  type Denuncia,
} from "@/lib/dominio/denuncias";

/**
 * A fila de denúncias, e o histórico delas: a mesma lista, porque a leitura
 * é a mesma e o que muda é ter ou não decisão a tomar.
 *
 * MESMA MECÂNICA DA FILA DE VERIFICAÇÕES: uma aberta por vez, e o conteúdo
 * só aparece ao expandir. Aqui isso não é só velocidade, é contenção: a
 * fotografia da conversa é o dado mais sensível do painel inteiro, e deixar
 * quinze mensagens de todas as denúncias abertas na tela de uma vez seria
 * expor muito mais do que a decisão exige.
 */
export function FilaDeDenuncias({
  denuncias,
  decidiveis,
}: {
  denuncias: Denuncia[];
  /** Falso no histórico: lá não há o que decidir de novo. */
  decidiveis: boolean;
}) {
  const [aberta, setAberta] = useState<string | null>(null);
  const [decidindo, setDecidindo] = useState<string | null>(null);

  if (denuncias.length === 0) {
    return (
      <p className="vazio">
        {decidiveis
          ? "Nenhuma denúncia esperando decisão."
          : "Nada decidido ainda."}
      </p>
    );
  }

  return (
    <div className="fila-de-revisao">
      {denuncias.map((denuncia) => {
        const estaAberta = aberta === denuncia.id;
        const arquivada = denuncia.status !== "open";

        return (
          <article
            key={denuncia.id}
            className={estaAberta ? "ficha aberta" : "ficha"}
          >
            <button
              type="button"
              className="linha-da-fila"
              aria-expanded={estaAberta}
              onClick={() => {
                setAberta(estaAberta ? null : denuncia.id);
                setDecidindo(null);
              }}
            >
              <span
                className={
                  arquivada
                    ? denuncia.status === "reviewed"
                      ? "selo decisao aprovada"
                      : "selo decisao recusada"
                    : "selo"
                }
              >
                {arquivada
                  ? rotuloDaDecisaoDaDenuncia(denuncia.status)
                  : motivoLegivel(denuncia.motivo)}
              </span>
              <span className="identidade">
                <strong>{denuncia.quemFoiDenunciado}</strong>
                <span className="detalhe">
                  {denuncia.denunciadoEhEscritorio ? "Escritório" : "Pessoa"}{" "}
                  · denunciado por {denuncia.quemDenunciou}
                  {arquivada ? ` · ${motivoLegivel(denuncia.motivo)}` : ""}
                </span>
                {/* O texto de quem denunciou aparece FECHADO: é a acusação,
                    e é o que decide se vale abrir a conversa. */}
                {denuncia.detalhes !== null && (
                  <span className="motivo-no-historico">
                    {denuncia.detalhes}
                  </span>
                )}
              </span>
              <span className="sinais">
                <span className="detalhe alinhado-a-direita">
                  {quandoAconteceu(denuncia.criadaEmIso)}
                  {arquivada && denuncia.revisor != null && (
                    <>
                      <br />
                      por {denuncia.revisor}
                    </>
                  )}
                </span>
                <span className="seta" aria-hidden>
                  {estaAberta ? "▲" : "▼"}
                </span>
              </span>
            </button>

            {estaAberta && (
              <div className="corpo-da-ficha">
                {arquivada && denuncia.nota != null && (
                  <p className="detalhe">
                    <strong>Decisão:</strong> {denuncia.nota}
                  </p>
                )}

                <p className="detalhe">
                  {denuncia.mensagens.length === 0
                    ? "Esta denúncia não trouxe mensagens: é anterior ao encaminhamento da conversa."
                    : `As ${denuncia.mensagens.length} últimas mensagens desta conversa, como estavam quando a denúncia foi feita.`}
                </p>

                {denuncia.mensagens.length > 0 && (
                  <div className="conversa-denunciada">
                    {denuncia.mensagens.map((mensagem) => {
                      const lado = ladoDaMensagem(mensagem, denuncia.quemDenunciouId);
                      return (
                        <div
                          key={mensagem.id}
                          className={`mensagem-denunciada ${lado}${
                            mensagem.id === denuncia.mensagemDenunciadaId
                              ? " apontada"
                              : ""
                          }`}
                        >
                          <span className="quem">
                            {lado === "denunciante"
                              ? denuncia.quemDenunciou
                              : lado === "denunciado"
                                ? denuncia.quemFoiDenunciado
                                : "Autor não identificado"}
                            {mensagem.apagada && (
                              <span className="selo faltando">
                                apagada depois
                              </span>
                            )}
                          </span>
                          <p>{mensagem.corpo}</p>
                          <span className="detalhe">
                            {quandoAconteceu(mensagem.criadaEmIso)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {decidiveis && (
                  <div className="decisao-da-revisao">
                    {decidindo === denuncia.id ? (
                      <form action={decidirDenuncia} className="forma-de-recusa">
                        <input type="hidden" name="denuncia" value={denuncia.id} />
                        <label htmlFor={`nota-${denuncia.id}`}>
                          O que foi feito (fica no histórico da equipe)
                        </label>
                        <textarea
                          id={`nota-${denuncia.id}`}
                          name="nota"
                          rows={2}
                          required
                          autoFocus
                          placeholder="Ex.: conteúdo confirmado, profissional notificado e conversa bloqueada."
                        />
                        <div className="acoes-em-linha">
                          <button type="submit" name="decisao" value="reviewed">
                            Providência tomada
                          </button>
                          <button
                            type="submit"
                            name="decisao"
                            value="dismissed"
                            className="secundario"
                          >
                            Sem providência
                          </button>
                          <button
                            type="button"
                            className="discreto"
                            onClick={() => setDecidindo(null)}
                          >
                            Cancelar
                          </button>
                        </div>
                      </form>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDecidindo(denuncia.id)}
                      >
                        Decidir
                      </button>
                    )}
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
