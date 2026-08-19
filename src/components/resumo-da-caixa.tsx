import Link from "next/link";

import type { Conversa } from "@/lib/dominio/conversas";
import { esperaDesde, esperandoHaMuito } from "@/lib/dominio/conversas";

import { Icone } from "./icone";

/**
 * O que o painel direito de Mensagens mostra quando nenhuma conversa está
 * aberta.
 *
 * ERA UMA FRASE num vazio de 800px ("Escolha uma conversa ao lado"). Um
 * advogado que deixa a tela aberta o dia todo olhava para um retângulo cinza.
 * Agora o painel responde a pergunta que a pessoa faz ao abrir Mensagens:
 * "quem está esperando por mim, e há quanto tempo?"
 *
 * NÃO INVENTA DADO: são as mesmas conversas da lista ao lado, agrupadas por
 * urgência. Estado vazio útil, não onboarding: no centésimo dia continua
 * dizendo a coisa certa, e no dia em que não há ninguém esperando diz isso
 * com uma linha e para.
 */
export function ResumoDaCaixa({
  conversas,
  baseHref,
  hrefSufixo = "",
  agora,
}: {
  conversas: Conversa[];
  baseHref: string;
  hrefSufixo?: string;
  agora: Date;
}) {
  const esperando = conversas
    .filter((conversa) => conversa.naoLidas > 0)
    .sort(
      (a, b) =>
        (a.ultimaMensagemEm?.getTime() ?? 0) -
        (b.ultimaMensagemEm?.getTime() ?? 0),
    );
  const paradasHaMuito = esperando.filter(
    (conversa) =>
      conversa.ultimaMensagemEm !== null &&
      esperandoHaMuito(conversa.ultimaMensagemEm, agora),
  );
  const naoLidasTotal = esperando.reduce(
    (soma, conversa) => soma + conversa.naoLidas,
    0,
  );

  if (conversas.length === 0) {
    return (
      <div className="painel-vazio">
        <Icone nome="mensagens" tamanho={28} className="icone-do-vazio" />
        <p className="titulo-do-vazio">Nenhuma conversa ainda</p>
        <p>
          Quando um cliente falar com o escritório, a conversa aparece na
          lista ao lado e abre aqui.
        </p>
      </div>
    );
  }

  if (esperando.length === 0) {
    return (
      <div className="painel-vazio">
        <Icone nome="check" tamanho={28} className="icone-do-vazio ok" />
        <p className="titulo-do-vazio">Tudo respondido</p>
        <p>
          Nenhuma conversa esperando resposta. Abra uma ao lado para
          continuar de onde parou.
        </p>
      </div>
    );
  }

  return (
    <div className="resumo-da-caixa">
      <div className="cabecalho-do-resumo">
        <div>
          <p className="titulo-do-resumo">
            {esperando.length === 1
              ? "1 conversa esperando resposta"
              : `${esperando.length} conversas esperando resposta`}
          </p>
          <p className="detalhe">
            {naoLidasTotal === 1
              ? "1 mensagem não lida"
              : `${naoLidasTotal} mensagens não lidas`}
            {paradasHaMuito.length > 0 && (
              <>
                {" · "}
                <span className="espera-longa">
                  {paradasHaMuito.length === 1
                    ? "1 há mais de um dia"
                    : `${paradasHaMuito.length} há mais de um dia`}
                </span>
              </>
            )}
          </p>
        </div>
      </div>

      <ol className="fila-de-espera">
        {esperando.slice(0, 8).map((conversa) => (
          <li key={conversa.id}>
            <Link
              href={`${baseHref}/${conversa.id}${hrefSufixo}`}
              className="item-da-fila"
            >
              <span className="avatar pequeno" aria-hidden>
                {conversa.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={conversa.avatarUrl} alt="" />
                ) : (
                  conversa.iniciais
                )}
              </span>
              <span className="conteudo">
                <span className="titulo">{conversa.titulo}</span>
                <span className="previa">{conversa.ultimaMensagem}</span>
              </span>
              <span className="sinais">
                <span className="pilula-nao-lidas">{conversa.naoLidas}</span>
                {conversa.ultimaMensagemEm !== null && (
                  <span
                    className={
                      esperandoHaMuito(conversa.ultimaMensagemEm, agora)
                        ? "detalhe espera-longa"
                        : "detalhe"
                    }
                  >
                    {esperaDesde(conversa.ultimaMensagemEm, agora)}
                  </span>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ol>

      {esperando.length > 8 && (
        <p className="detalhe" style={{ marginTop: 8 }}>
          E mais {esperando.length - 8} na lista ao lado.
        </p>
      )}
    </div>
  );
}
