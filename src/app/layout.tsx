import type { Metadata } from "next";

import "./globals.css";

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
    <html lang="pt-BR">
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
