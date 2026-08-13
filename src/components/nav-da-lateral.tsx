"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface ItemDaLateral {
  rotulo: string;
  href: string;
  /** Prefixos de rota que acendem este item (o próprio href sempre conta). */
  tambem?: string[];
}

/**
 * A navegação da barra lateral.
 *
 * É CLIENTE por um motivo de velocidade: o item aceso depende do caminho
 * atual, e ler o caminho aqui (usePathname) permite que a casca inteira
 * viva num LAYOUT. Layout não re-renderiza a cada navegação, então a
 * lateral para de ser refeita, e a contagem do sino para de ser
 * reconsultada, a cada troca de tela. Antes, com o caminho vindo por prop
 * do servidor, a casca precisava morar dentro de cada página.
 *
 * O destaque também passa a acender NA HORA do clique, sem esperar a
 * resposta do servidor.
 */
export function NavDaLateral({
  itens,
  naoLidas,
}: {
  itens: ItemDaLateral[];
  naoLidas: number;
}) {
  const caminho = usePathname() ?? "";

  const acende = (item: ItemDaLateral) =>
    caminho === item.href ||
    (item.tambem ?? []).some(
      (prefixo) => caminho === prefixo || caminho.startsWith(`${prefixo}/`),
    ) ||
    (item.href !== "/advogado" &&
      item.href !== "/escritorio" &&
      caminho.startsWith(`${item.href}/`));

  return (
    <nav aria-label="Seções">
      {itens.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={acende(item) ? "ativa" : ""}
          aria-current={acende(item) ? "page" : undefined}
        >
          {item.rotulo}
          {item.rotulo === "Notificações" && naoLidas > 0 && (
            <span className="pilula-nao-lidas">{naoLidas}</span>
          )}
        </Link>
      ))}
    </nav>
  );
}
