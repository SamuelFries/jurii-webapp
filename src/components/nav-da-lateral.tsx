"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { itemAceso, type ItemDaLateral } from "@/lib/dominio/lateral";

import { SinoVivo } from "./sino-vivo";

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
  escopo,
  lawFirmId,
}: {
  itens: ItemDaLateral[];
  naoLidas: number;
  escopo: "lawyer" | "firm";
  lawFirmId: string | null;
}) {
  const caminho = usePathname() ?? "";

  return (
    <nav aria-label="Seções">
      {itens.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={itemAceso(item, caminho) ? "ativa" : ""}
          aria-current={itemAceso(item, caminho) ? "page" : undefined}
        >
          {item.rotulo}
          {item.rotulo === "Notificações" && (
            <SinoVivo
              escopo={escopo}
              lawFirmId={lawFirmId}
              inicial={naoLidas}
            />
          )}
        </Link>
      ))}
    </nav>
  );
}
