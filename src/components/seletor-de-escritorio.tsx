import { trocarDeEscritorio } from "@/app/escritorio/acoes";
import {
  papelPrincipal,
  rotuloDoPapel,
  type VinculoDeEscritorio,
} from "@/lib/fluxos";

import { Icone } from "./icone";

/**
 * "Atuando como": onde estou, e como quem.
 *
 * SEMPRE PRESENTE. A versão anterior só existia com dois ou mais vínculos,
 * pela lógica de que seletor de uma opção não seleciona nada. A lógica era
 * certa para o SELETOR e errada para o CONTEXTO: quem tem um escritório só
 * também precisa ler, na lateral, em qual banca está e com que papel, sem
 * caçar isso no título da tela. Então o cabeçalho é sempre exibido, e a seta
 * de abrir a lista só aparece quando há para onde ir.
 *
 * Na área do ADVOGADO nenhum escritório está ativo, e o cabeçalho diz isso
 * com todas as letras ("Área pessoal"): "estou vendo o meu, não o da banca"
 * é a informação que mais evita erro de contexto.
 *
 * Recolhido por padrão, `details`/`summary` nativo, `form` com server
 * action: abre e fecha sem JavaScript, e depois de trocar o redirect entrega
 * a página nova com a lista fechada.
 */
export function SeletorDeEscritorio({
  escritorios,
  ativo,
  fluxo,
}: {
  escritorios: VinculoDeEscritorio[];
  ativo: string;
  fluxo: "escritorio" | "advogado";
}) {
  const vinculoAtivo =
    fluxo === "escritorio"
      ? (escritorios.find((escritorio) => escritorio.id === ativo) ?? null)
      : null;
  const opcoes = escritorios.filter(
    (escritorio) => escritorio.id !== vinculoAtivo?.id,
  );
  const temParaOndeIr = opcoes.length > 0;

  const cabecalho =
    vinculoAtivo !== null ? (
      <>
        <span className="avatar-de-contexto" aria-hidden>
          {vinculoAtivo.iniciais}
        </span>
        <span className="identidade">
          {/* O nome trunca na largura da lateral; o title entrega o nome
              inteiro no hover sem alargar nada. */}
          <span className="nome" title={vinculoAtivo.nome}>
            {vinculoAtivo.nome}
          </span>
          <span className="cargo">
            {rotuloDoPapel(papelPrincipal(vinculoAtivo.papeis))}
          </span>
        </span>
      </>
    ) : (
      <>
        <span className="avatar-de-contexto pessoal" aria-hidden>
          <Icone nome="advogado" tamanho={16} />
        </span>
        <span className="identidade">
          <span className="nome">Área pessoal</span>
          <span className="cargo">Suas conversas e casos</span>
        </span>
      </>
    );

  return (
    <div className="seletor-de-escritorio">
      <span className="rotulo-da-secao">Atuando como</span>
      {temParaOndeIr ? (
        <details>
          <summary
            aria-current={vinculoAtivo !== null ? "true" : undefined}
          >
            {cabecalho}
            <Icone nome="seta-baixo" tamanho={16} className="seta" />
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
                <span className="avatar-de-contexto" aria-hidden>
                  {escritorio.iniciais}
                </span>
                <span className="identidade">
                  <span className="nome" title={escritorio.nome}>
                    {escritorio.nome}
                  </span>
                  <span className="cargo">
                    {rotuloDoPapel(papelPrincipal(escritorio.papeis))}
                  </span>
                </span>
              </button>
            ))}
          </form>
        </details>
      ) : (
        <div className="contexto-fixo" aria-current="true">
          {cabecalho}
        </div>
      )}
    </div>
  );
}
