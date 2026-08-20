import Image from "next/image";

import { Aurora } from "./aurora";
import { CartaoVivo } from "./cartao-vivo";
import { caminhoInterno } from "@/lib/caminho-seguro";

import { FormularioDeEntrada } from "./formulario";

/**
 * A entrada é uma cena: a aurora do Jurii ao fundo (navy e dourado, lenta,
 * indiferente ao cursor), um PALCO de marca à esquerda dizendo para quem
 * isto existe, e o cartão de vidro à direita fazendo o trabalho. Em tela
 * estreita o palco sai de cena e o cartão volta ao centro, que é a
 * composição do aplicativo.
 */
export default async function PaginaDeEntrada({
  searchParams,
}: {
  searchParams: Promise<{ depois?: string }>;
}) {
  // Para onde voltar depois de entrar. Saneado AQUI, no servidor: destino de
  // redirecionamento vindo da URL é a definição de open redirect, e quem
  // decide o que é caminho interno é o parser, não prefixo de string.
  const { depois } = await searchParams;
  const destino = caminhoInterno(depois, "/");
  return (
    <div className="tela-de-entrada">
      <Aurora />

      <section className="palco-da-entrada" aria-hidden>
        <p className="chamada-do-palco">Para advogados e escritórios</p>
        <h2 className="titulo-do-palco">
          O dia inteiro do escritório,
          <br />
          numa tela só.
        </h2>
        <p className="fala-do-palco">
          Mensagens, casos, agenda e equipe no computador, em sintonia com o
          aplicativo do seu cliente.
        </p>
        <ul className="provas-do-palco">
          <li>Conversas com clientes em tempo real</li>
          <li>A carteira de casos e quem faz o quê</li>
          <li>Agenda que vive no seu calendário</li>
        </ul>
      </section>

      <div className="coluna-do-cartao">
        <CartaoVivo>
          <h1 className="so-para-leitores">Entrar no Jurii</h1>
          {/* O lockup acompanha o tema do cartão: navy no claro, branco no
              escuro. Duas imagens e o CSS decide, sem JavaScript. */}
          <Image
            src="/marca/jurii-lockup-empilhado-claro.png"
            alt="Jurii"
            width={666}
            height={666}
            priority
            className="lockup-da-entrada lockup-claro"
          />
          <Image
            src="/marca/jurii-lockup-empilhado-escuro.png"
            alt=""
            aria-hidden
            width={666}
            height={666}
            priority
            className="lockup-da-entrada lockup-escuro"
          />
          <p className="subtitulo subtitulo-da-entrada">
            Tudo do seu escritório, conectado ao aplicativo.
          </p>
          <FormularioDeEntrada depois={destino} />
        </CartaoVivo>
        <p className="selo-da-entrada">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect x="4" y="11" width="16" height="9" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
          Acesso seguro e integrado ao aplicativo.
        </p>
      </div>
    </div>
  );
}
