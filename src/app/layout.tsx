import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "./globals.css";

/**
 * A fonte da casa. Até aqui o webapp usava a pilha do sistema (Segoe no
 * Windows, SF no Mac, Roboto no Android): o produto não tinha cara própria
 * em texto, e o mesmo layout media diferente em cada máquina.
 *
 * `next/font` baixa a fonte NO BUILD e a serve do próprio domínio: zero
 * requisição ao Google em runtime, zero CSP para abrir, zero layout shift
 * (o fallback é ajustado por métrica). Inter porque é a que melhor lê em
 * densidade: números tabulares, formas abertas, e é neutra o bastante para
 * a marca falar pelo dourado e pelo navy, não pela fonte.
 */
const inter = Inter({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--fonte",
});

export const metadata: Metadata = {
  title: "Jurii na web",
  description:
    "O Jurii no computador: mensagens, casos e a gestão do escritório para advogados e escritórios.",
  robots: { index: false, follow: false },
};

export default function LayoutRaiz({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body>
        {children}
        <footer className="rodape">
          <span>
            Jurii · CNPJ e contato em{" "}
            <a href="https://jurii.com.br">jurii.com.br</a>
          </span>
          <a href="https://jurii.com.br/privacidade.html">Privacidade</a>
          <a href="https://jurii.com.br/termos.html">Termos</a>
        </footer>
      </body>
    </html>
  );
}
