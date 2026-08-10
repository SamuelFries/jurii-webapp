import Image from "next/image";

import { FormularioDeEntrada } from "./formulario";
import { FundoAnimado } from "./fundo-animado";

/**
 * A entrada espelha a tela de login do app: o lockup empilhado da marca
 * sobre o cartão de credenciais. Aqui o cartão flutua sobre o azul do
 * Jurii, com os espectros de luz seguindo o cursor ao redor; o retângulo
 * central continua sendo o protagonista.
 */
export default function PaginaDeEntrada() {
  return (
    <div className="tela-de-entrada">
      <FundoAnimado />
      <main className="cartao-de-entrada">
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
      </main>
    </div>
  );
}
