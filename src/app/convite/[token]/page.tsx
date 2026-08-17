import Link from "next/link";

import { clienteDoServidor } from "@/lib/supabase/servidor";
import { rotuloDoPapel, type PapelNoEscritorio } from "@/lib/fluxos";

import { aceitarConvite } from "./acoes";

export const dynamic = "force-dynamic";

/**
 * A página que o link de convite abre.
 *
 * Quem chega aqui foi CHAMADO: recebeu o link da secretária ou do estagiário
 * pelo canal que o gestor escolheu. A página diz quem chamou e para quê,
 * ANTES de pedir qualquer coisa — ninguém cria conta às cegas para só então
 * descobrir o que era.
 *
 * Link morto (usado, vencido, cancelado) diz o que aconteceu e o caminho:
 * pedir outro para quem convidou. Nenhum estado termina em botão que não
 * leva a lugar nenhum.
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
                  Entrar para aceitar
                </Link>
                <p className="detalhe" style={{ marginTop: 10 }}>
                  Ainda não tem conta? O botão acima também leva ao cadastro,
                  e o convite continua esperando você aqui.
                </p>
              </>
            ) : (
              <form action={aceitarConvite}>
                <input type="hidden" name="token" value={token} />
                <button type="submit">Aceitar convite</button>
              </form>
            )}
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
