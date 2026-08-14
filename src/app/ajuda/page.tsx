import Link from "next/link";

import { contextoLogado, escritorioPreferido } from "@/lib/contexto";
import { secoesDeAjuda } from "@/lib/dominio/ajuda";
import { destinoInicial } from "@/lib/fluxos";

export const dynamic = "force-dynamic";

/**
 * A CENTRAL DE AJUDA do computador.
 *
 * NEUTRA DE FLUXO, como a tela da conta: ela vale para o advogado e para o
 * escritório, então não exige vínculo nem verificação. Quem chegou aqui
 * ainda sem papel nenhum é justamente quem mais precisa das primeiras
 * perguntas (como enviar a verificação, como abrir escritório), e barrar
 * essa pessoa seria esconder a resposta de quem a procura.
 *
 * Sem barra lateral pelo mesmo motivo da conta: a lateral é de UM fluxo, e
 * esta página não escolhe fluxo. O caminho de volta é `destinoInicial`, que
 * sabe a casa de quem está lendo (o escritório aberto, a área do advogado
 * ou a fila de revisão), em vez de um destino fixo que devolveria parte das
 * pessoas para uma tela que as expulsa.
 *
 * O CONTEÚDO mora em `@/lib/dominio/ajuda`, e não aqui, para o teste poder
 * conferir cada atalho contra as rotas que existem de verdade.
 */
export default async function PaginaDeAjuda() {
  // Juntos, e não em sequência: o cookie não depende da sessão.
  const [contexto, preferido] = await Promise.all([
    contextoLogado(),
    escritorioPreferido(),
  ]);
  const casa = destinoInicial(contexto.fluxos, preferido);

  return (
    <main className="pagina">
      <div className="linha-topo">
        <h1 style={{ margin: 0 }}>Ajuda</h1>
        <Link className="botao secundario compacto" href={casa}>
          Voltar
        </Link>
      </div>
      <p className="subtitulo">
        Como o Jurii funciona no computador, e onde cada coisa fica.
      </p>

      {secoesDeAjuda.map((secao) => (
        <section key={secao.titulo}>
          <h2 className="secao">{secao.titulo}</h2>
          {secao.perguntas.map((item) => (
            <details key={item.pergunta} className="pergunta-de-ajuda">
              <summary>{item.pergunta}</summary>
              <div className="resposta-de-ajuda">
                {item.resposta.map((paragrafo) => (
                  <p key={paragrafo}>{paragrafo}</p>
                ))}
                {item.atalhos !== undefined && (
                  <div className="acoes-em-linha">
                    {item.atalhos.map((atalho) => (
                      <Link
                        key={atalho.href}
                        className="botao secundario compacto"
                        href={atalho.href}
                      >
                        {atalho.rotulo}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </details>
          ))}
        </section>
      ))}
    </main>
  );
}
