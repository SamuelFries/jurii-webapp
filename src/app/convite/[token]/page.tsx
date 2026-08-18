import Link from "next/link";

import { clienteDoServidor } from "@/lib/supabase/servidor";
import { rotuloDoPapel, type PapelNoEscritorio } from "@/lib/fluxos";

import { pedirEntrada } from "./acoes";

export const dynamic = "force-dynamic";

/**
 * A página que o link de convite abre.
 *
 * Quem chega aqui foi CHAMADO: recebeu o link da secretária ou do estagiário
 * pelo canal que o gestor escolheu. A página diz quem chamou e para quê,
 * ANTES de pedir qualquer coisa — ninguém cria conta às cegas para só então
 * descobrir o que era.
 *
 * O LINK PEDE, NÃO CONCEDE: clicar cria uma solicitação que um sócio ou
 * admin aprova. Quem chegou vê exatamente em que pé está, inclusive ao
 * reabrir o link depois (a espiada reconhece quem o consumiu, senão a pessoa
 * que aguarda leria "já foi usado" e concluiria que perdeu a vaga).
 *
 * Link morto (usado por OUTRA pessoa, vencido, cancelado) diz o que
 * aconteceu e o caminho: pedir outro para quem convidou. Nenhum estado
 * termina em botão que não leva a lugar nenhum.
 */
export default async function PaginaDoConvite({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { token } = await params;
  const { erro } = await searchParams;
  const supabase = await clienteDoServidor();

  // A espiada NÃO consome o link e roda até sem sessão (grant para anon):
  // é o que permite mostrar a banca e o papel para quem ainda vai criar conta.
  const { data } = await supabase.rpc("espiar_link_de_convite", {
    token_value: token,
  });
  const convite = ((data as unknown[]) ?? [])[0] as
    | {
        situacao: string;
        firm_name: string | null;
        firm_initials: string | null;
        member_role: string | null;
      }
    | undefined;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const situacao = convite?.situacao ?? "inexistente";
  const papel =
    convite?.member_role == null
      ? ""
      : rotuloDoPapel(convite.member_role as PapelNoEscritorio);

  return (
    <main className="pagina-do-convite">
      <div className="cartao" style={{ maxWidth: 460, width: "100%" }}>
        <Link href="/" className="marca marca-pequena">
          jurii<span className="ouro">.</span>
        </Link>

        {situacao === "valido" && convite ? (
          <>
            <span className="avatar-do-convite" aria-hidden>
              {convite.firm_initials ?? "E"}
            </span>
            <h1>{convite.firm_name}</h1>
            <p className="subtitulo">
              convidou você para entrar na equipe como{" "}
              <strong>{papel}</strong>.
            </p>

            {erro !== undefined && <p className="erro">{erro}</p>}

            {user === null ? (
              <>
                {/* O destino de volta é ESTA página: entrar (ou criar a
                    conta) e cair de novo no convite, com um botão só pela
                    frente. */}
                <Link
                  className="botao"
                  href={`/entrar?depois=${encodeURIComponent(`/convite/${token}`)}`}
                >
                  Entrar para pedir
                </Link>
                <p className="detalhe" style={{ marginTop: 10 }}>
                  Ainda não tem conta? O botão acima também leva ao cadastro,
                  e o convite continua esperando você aqui.
                </p>
              </>
            ) : (
              <>
                <form action={pedirEntrada}>
                  <input type="hidden" name="token" value={token} />
                  <button type="submit">Pedir para entrar</button>
                </form>
                {/* Dito ANTES do clique: quem espera aprovação precisa saber
                    que vai esperar, senão lê a tela seguinte como falha. */}
                <p className="detalhe" style={{ marginTop: 10 }}>
                  Um sócio ou admin do escritório confirma seu pedido. Você é
                  avisado assim que decidirem.
                </p>
              </>
            )}
          </>
        ) : situacao.startsWith("meu_pedido") ? (
          <>
            <span className="avatar-do-convite" aria-hidden>
              {convite?.firm_initials ?? "E"}
            </span>
            <h1>
              {situacao === "meu_pedido_pendente"
                ? "Pedido enviado"
                : situacao === "meu_pedido_aprovado"
                  ? "Você entrou na equipe"
                  : situacao === "meu_pedido_recusado"
                    ? "Pedido não aprovado"
                    : "Pedido expirado"}
            </h1>
            <p className="subtitulo">
              {situacao === "meu_pedido_pendente"
                ? `Um sócio ou admin de ${convite?.firm_name ?? "o escritório"} vai confirmar. Você é avisado assim que decidirem, e não precisa ficar nesta página.`
                : situacao === "meu_pedido_aprovado"
                  ? `Você já faz parte de ${convite?.firm_name ?? "o escritório"}.`
                  : situacao === "meu_pedido_recusado"
                    ? "O escritório não aprovou este pedido. Se foi engano, fale com quem te convidou."
                    : "Ninguém decidiu a tempo e o pedido venceu. Peça um link novo para quem te convidou."}
            </p>
            <Link className="botao secundario" href="/">
              Ir para o início
            </Link>
          </>
        ) : (
          <>
            <h1>
              {situacao === "usado"
                ? "Este link já foi usado"
                : situacao === "expirado"
                  ? "Este link venceu"
                  : situacao === "revogado"
                    ? "Este link foi cancelado"
                    : "Convite não encontrado"}
            </h1>
            <p className="subtitulo">
              {situacao === "usado"
                ? "Cada link de convite entra uma vez só. Peça um novo para quem te convidou."
                : situacao === "expirado"
                  ? "Links de convite valem por 7 dias. Peça um novo para quem te convidou."
                  : situacao === "revogado"
                    ? "O escritório cancelou este convite. Se foi engano, é só pedirem outro."
                    : "Confira se o endereço veio inteiro na mensagem, ou peça o link de novo."}
            </p>
            <Link className="botao secundario" href="/">
              Ir para o início
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
