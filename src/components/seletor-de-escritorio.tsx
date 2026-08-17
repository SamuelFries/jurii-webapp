import { trocarDeEscritorio } from "@/app/escritorio/acoes";
import {
  papelPrincipal,
  rotuloDoPapel,
  type VinculoDeEscritorio,
} from "@/lib/fluxos";

/**
 * "Atuando como": o escritório ativo, e os outros atrás de um toque.
 *
 * SÓ APARECE COM DOIS OU MAIS vínculos. Com um só, um seletor de uma opção
 * seria um controle que não controla nada, e o nome do escritório já está no
 * título da tela.
 *
 * RECOLHIDO POR PADRÃO, mostrando só o ativo. A lista completa na lateral
 * escalava mal: com quatro ou cinco vínculos ela dominava o rodapé e
 * empurrava "Trocar de área" e "Sair" para fora da dobra, para exibir
 * escritórios em que a pessoa NÃO está atuando agora. O que importa sempre
 * (onde estou) fica visível; o que importa às vezes (para onde posso ir)
 * fica a um toque.
 *
 * Expandido, a lista traz SÓ os outros: repetir o ativo ali seria um botão
 * que não faz nada. E é `details`/`summary`, não menu de cliente, pela mesma
 * regra da troca em si: `form` com server action, funcionando sem
 * JavaScript. Depois de trocar, o redirect entrega a página nova com a
 * lista fechada, sem estado pendurado.
 *
 * Mora no rodapé da lateral, junto de "Trocar de área", porque é a mesma
 * pergunta feita num nível abaixo: lá se troca de FLUXO (escritório,
 * advogado), aqui se troca de ESCRITÓRIO.
 */
export function SeletorDeEscritorio({
  escritorios,
  ativo,
}: {
  escritorios: VinculoDeEscritorio[];
  ativo: string;
}) {
  if (escritorios.length < 2) return null;

  const vinculoAtivo =
    escritorios.find((escritorio) => escritorio.id === ativo) ?? null;
  // Na área do advogado nenhum escritório está ativo: o cabeçalho vira o
  // convite neutro e a lista traz todos.
  const opcoes = escritorios.filter(
    (escritorio) => escritorio.id !== vinculoAtivo?.id,
  );

  return (
    <div className="seletor-de-escritorio">
      <span className="rotulo-da-secao">Atuando como</span>
      <details>
        <summary aria-current={vinculoAtivo !== null ? "true" : undefined}>
          <span className="identidade">
            {vinculoAtivo !== null ? (
              <>
                <span className="nome">{vinculoAtivo.nome}</span>
                <span className="cargo">
                  {rotuloDoPapel(papelPrincipal(vinculoAtivo.papeis))}
                </span>
              </>
            ) : (
              <span className="nome">Trocar de escritório</span>
            )}
          </span>
          <span className="seta" aria-hidden="true" />
        </summary>
        <form action={trocarDeEscritorio}>
          {opcoes.map((escritorio) => (
            <button
              key={escritorio.id}
              type="submit"
              name="escritorio"
              value={escritorio.id}
              className="opcao-de-escritorio"
            >
              <span className="nome">{escritorio.nome}</span>
              <span className="cargo">
                {rotuloDoPapel(papelPrincipal(escritorio.papeis))}
              </span>
            </button>
          ))}
        </form>
      </details>
    </div>
  );
}
