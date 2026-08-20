import Link from "next/link";
import { redirect } from "next/navigation";

import { contextoLogado } from "@/lib/contexto";
import { destinoInicial } from "@/lib/fluxos";
import { sair } from "@/app/entrar/acoes";

export const dynamic = "force-dynamic";

/**
 * A PORTA HONESTA para quem entra sem papel profissional.
 *
 * O webapp é a mesa de trabalho de advogados e escritórios; a área do
 * cliente vive no aplicativo. Sem esta página, quem tem só conta de
 * cliente cairia numa mesa vazia ou num erro, que é pior do que uma
 * explicação. Por isso a tela é uma ORIENTAÇÃO, não um bloqueio: diz onde
 * cada lado da relação trabalha e oferece o caminho de cada um (o aplicativo
 * para o cliente; a verificação da OAB para o advogado). Nada de "acesso
 * negado".
 *
 * Quem TEM papel profissional nunca chega aqui: é redirecionado para a
 * casa dele, porque um advogado que digitar /cliente por engano quer a
 * mesa de trabalho, não este aviso.
 *
 * Herda o fundo do tema (navy no escuro, limpo no claro) e o rodapé
 * institucional global do layout raiz. Sem canvas próprio: esta é uma tela
 * de dentro da conta, não a porta de entrada.
 */
export default async function AreaDoCliente() {
  const contexto = await contextoLogado();
  const casa = destinoInicial(contexto.fluxos);
  if (casa !== "/cliente") redirect(casa);

  return (
    <main className="pagina">
      <div
        className="cartao orientacao"
        style={{ maxWidth: 540, margin: "48px auto" }}
      >
        <h1>Este espaço é para advogados e escritórios</h1>
        <p className="subtitulo">
          O Jurii tem um ambiente para cada lado da relação. No aplicativo,
          clientes encontram profissionais, conversam e acompanham seus casos.
          A mesa de trabalho no computador é exclusiva para advogados e
          equipes.
        </p>

        <div className="blocos">
          {/* Área principal: a maioria de quem cai aqui é cliente, e o caminho
              deles é o aplicativo/site. Por isso o botão primário. */}
          <div className="cartao bloco">
            <strong>Não é advogado?</strong>
            <p className="detalhe">
              Encontre profissionais, converse com escritórios e acompanhe
              seus casos pelo aplicativo Jurii.
            </p>
            <a className="botao" href="https://jurii.com.br">
              Ir para jurii.com.br
            </a>
          </div>

          {/* Área do profissional: mesma ideia do card que já funcionava, com
              o fluxo de verificação intacto. */}
          <div className="cartao bloco">
            <strong>É advogado ou advogada?</strong>
            <p className="detalhe">
              Verifique sua OAB para liberar a mesa de trabalho nesta conta.
              Após a aprovação, o acesso profissional será liberado.
            </p>
            <Link className="botao secundario" href="/verificacao">
              Verificar minha OAB
            </Link>
          </div>
        </div>

        {/* Ações da conta, em terceiro plano: existem, mas não competem com a
            orientação. Nada foi removido. */}
        <div className="acoes-discretas">
          <Link href="/conta">Minha conta</Link>
          <span aria-hidden>·</span>
          <form action={sair}>
            <button type="submit" className="discreto">
              Sair
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
