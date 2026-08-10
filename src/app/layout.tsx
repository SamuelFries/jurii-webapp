import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Jurii, área do escritório",
  description:
    "Gestão da assinatura do seu escritório no Jurii: plano, ciclo de cobrança e pagamento.",
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
