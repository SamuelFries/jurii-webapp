import { trocarDeEscritorio } from "@/app/escritorio/acoes";
import {
  papelPrincipal,
  rotuloDoPapel,
  type VinculoDeEscritorio,
} from "@/lib/fluxos";

/**
 * "Atuando como": o escritório ativo e o cargo NELE.
 *
 * SÓ APARECE COM DOIS OU MAIS vínculos. Com um só, um seletor de uma opção
 * seria um controle que não controla nada, e o nome do escritório já está no
 * título da tela.
 *
 * Mora no rodapé da lateral, junto de "Trocar de área", porque é a mesma
 * pergunta feita num nível abaixo: lá se troca de FLUXO (escritório,
 * advogado), aqui se troca de ESCRITÓRIO. Inventar um menu no topo colocaria
 * duas gramáticas de troca na mesma tela.
 *
 * É `form` com server action, e não um menu de cliente, porque a troca
 * PERSISTE (grava o cookie do último aberto) e termina em navegação. Sem
 * JavaScript, continua funcionando.
 */
export function SeletorDeEscritorio({
  escritorios,
  ativo,
}: {
  escritorios: VinculoDeEscritorio[];
  ativo: string;
}) {
  if (escritorios.length < 2) return null;

  return (
    <div className="seletor-de-escritorio">
      <span className="rotulo-da-secao">Atuando como</span>
      <form action={trocarDeEscritorio}>
        {escritorios.map((escritorio) => {
          const ehAtivo = escritorio.id === ativo;
          return (
            <button
              key={escritorio.id}
              type="submit"
              name="escritorio"
              value={escritorio.id}
              className={ehAtivo ? "opcao-de-escritorio ativa" : "opcao-de-escritorio"}
              aria-current={ehAtivo ? "true" : undefined}
              disabled={ehAtivo}
            >
              <span className="nome">{escritorio.nome}</span>
              <span className="cargo">
                {rotuloDoPapel(papelPrincipal(escritorio.papeis))}
              </span>
            </button>
          );
        })}
      </form>
    </div>
  );
}
