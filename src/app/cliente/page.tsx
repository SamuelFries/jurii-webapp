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
 * explicação. Ela não promete o que não existe: enquanto não houver link
 * de loja publicado, o caminho oferecido é o site e a própria conta.
 *
 * Quem TEM papel profissional nunca chega aqui: é redirecionado para a
 * casa dele, porque um advogado que digitar /cliente por engano quer a
 * mesa de trabalho, não este aviso.
 */
export default async function AreaDoCliente() {
  const contexto = await contextoLogado();
  const casa = destinoInicial(contexto.fluxos);
  if (casa !== "/cliente") redirect(casa);

  return (
    <main className="pagina">
      <div className="cartao" style={{ maxWidth: 520, margin: "48px auto" }}>
        <h1 style={{ marginTop: 0 }}>Sua área da Jurii é no aplicativo</h1>
        <p>
          Este endereço é a mesa de trabalho de advogados e escritórios.
          Encontrar profissional, conversar e acompanhar seus casos acontece
          no aplicativo, no seu celular.
        </p>
        <p className="detalhe">
          Sua conta é a mesma nos dois lugares.
        </p>

        <div className="cartao" style={{ marginTop: 16, textAlign: "left" }}>
          <strong>É advogado ou advogada?</strong>
          <p className="detalhe" style={{ marginTop: 4 }}>
            Envie a verificação da OAB por aqui mesmo. Quando ela for
            aprovada, a mesa de trabalho abre nesta conta.
          </p>
          <Link className="botao" href="/verificacao">
            Verificar minha OAB
          </Link>
        </div>

        <div className="acoes-em-linha" style={{ marginTop: 14 }}>
          <a className="botao secundario" href="https://jurii.com.br">
            Ir para jurii.com.br
          </a>
          <Link className="botao secundario" href="/conta">
            Minha conta
          </Link>
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
