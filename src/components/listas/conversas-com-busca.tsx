"use client";

import Link from "next/link";
import { useState } from "react";

import {
  filtraConversas,
  type ConversaParaTela,
} from "@/lib/busca/filtros";

import { CampoDeBusca, FileiraDeChips, NadaEncontrado } from "./controles";

/**
 * A lista de conversas com a busca do app: varre nome e área (NUNCA a
 * prévia da última mensagem, que é só a última), chip de não lidas quando
 * ele separa, e "nenhum resultado" que diz que nada sumiu.
 */
export function ConversasComBusca({
  conversas,
  baseHref,
  vazio,
  rotuloNaoLidas = "Não lidas",
  placeholder,
}: {
  conversas: ConversaParaTela[];
  baseHref: string;
  vazio: string;
  rotuloNaoLidas?: string;
  placeholder: string;
}) {
  const [termo, setTermo] = useState("");
  const [soNaoLidas, setSoNaoLidas] = useState(false);

  if (conversas.length === 0) {
    return <p className="vazio">{vazio}</p>;
  }

  const visiveis = filtraConversas(conversas, termo, soNaoLidas);
  const naoLidas = conversas.filter((conversa) => conversa.naoLidas > 0).length;
  const plural = conversas.length === 1 ? "conversa continua" : "conversas continuam";

  return (
    <>
      <CampoDeBusca
        valor={termo}
        aoMudar={setTermo}
        placeholder={placeholder}
        rotulo="Buscar nas conversas"
      />
      <FileiraDeChips
        total={conversas.length}
        chips={[
          {
            rotulo: rotuloNaoLidas,
            casa: naoLidas,
            ativo: soNaoLidas,
            aoAlternar: () => setSoNaoLidas((atual) => !atual),
          },
        ]}
      />

      {visiveis.length === 0 ? (
        <NadaEncontrado
          mensagem={`Nenhuma conversa combina com esse filtro. Suas ${conversas.length} ${plural} aqui.`}
          aoLimpar={() => {
            setTermo("");
            setSoNaoLidas(false);
          }}
        />
      ) : (
        <div className="lista-empilhada">
          {visiveis.map((conversa) => (
            <Link
              key={conversa.id}
              href={`${baseHref}/${conversa.id}`}
              className="cartao-de-lista"
            >
              <span className="avatar" aria-hidden>
                {conversa.avatarUrl !== null ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={conversa.avatarUrl} alt="" />
                ) : (
                  conversa.iniciais
                )}
              </span>
              <span className="conteudo">
                <span className="titulo">
                  {conversa.titulo}
                  {conversa.naoLidas > 0 && (
                    <span className="pilula-nao-lidas">{conversa.naoLidas}</span>
                  )}
                </span>
                <p className="linha-2">{conversa.especialidade}</p>
                <p className="linha-2">
                  {conversa.ultimaMensagem === ""
                    ? "Sem mensagens ainda"
                    : conversa.ultimaMensagem}
                </p>
              </span>
              {conversa.quando !== null && (
                <span className="detalhe" style={{ whiteSpace: "nowrap" }}>
                  {conversa.quando}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
