import Image from "next/image";

import { CartaoVivo } from "./cartao-vivo";
import { FormularioDeEntrada } from "./formulario";
import { FundoAnimado } from "./fundo-animado";

/**
 * A entrada espelha a tela de login do app: o lockup empilhado da marca
 * sobre o cartão de credenciais. Aqui o cartão é VIDRO sobre o azul do
 * Jurii: a constelação atrás segue o cursor, o cartão inclina de leve na
 * direção da mão e a borda acende no ponto mais próximo dela. O retângulo
 * central continua sendo o protagonista; o resto é luz a serviço dele.
 */
export default function PaginaDeEntrada() {
  return (
    <div className="tela-de-entrada">
      <FundoAnimado />
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
          Mensagens, casos e a gestão do escritório no seu computador, com a
          mesma conta do aplicativo.
        </p>
        <FormularioDeEntrada />
      </CartaoVivo>
      <p className="selo-da-entrada">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="4" y="11" width="16" height="9" rx="2" />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </svg>
        A mesma conta do aplicativo, protegida do início ao fim.
      </p>
    </div>
  );
}
