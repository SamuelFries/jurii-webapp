import Link from "next/link";

import { rotuloDeHorario, type Conversa } from "@/lib/dominio/conversas";

export function ListaDeConversas({
  conversas,
  baseHref,
  vazio,
}: {
  conversas: Conversa[];
  baseHref: string;
  vazio: string;
}) {
  if (conversas.length === 0) {
    return <p className="vazio">{vazio}</p>;
  }

  const agora = new Date();

  return (
    <div className="lista-empilhada">
      {conversas.map((conversa) => (
        <Link
          key={conversa.id}
          href={`${baseHref}/${conversa.id}`}
          className="cartao-de-lista"
        >
          <span className="avatar" aria-hidden>
            {conversa.avatarUrl !== null ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={conversa.avatarUrl} alt="" />
            ) : (
              conversa.iniciais
            )}
          </span>
          <span className="conteudo">
            <span className="titulo">
              {conversa.titulo}
              {conversa.naoLidas > 0 && (
                <span className="pilula-nao-lidas">{conversa.naoLidas}</span>
              )}
            </span>
            <p className="linha-2">{conversa.especialidade}</p>
            <p className="linha-2">
              {conversa.ultimaMensagem === ""
                ? "Sem mensagens ainda"
                : conversa.ultimaMensagem}
            </p>
          </span>
          {conversa.ultimaMensagemEm !== null && (
            <span className="detalhe" style={{ whiteSpace: "nowrap" }}>
              {rotuloDeHorario(conversa.ultimaMensagemEm, agora)}
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}
