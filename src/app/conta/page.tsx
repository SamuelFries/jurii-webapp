import Link from "next/link";

import { contextoLogado } from "@/lib/contexto";
import { urlDoAvatar } from "@/lib/avatar";
import { sair } from "@/app/entrar/acoes";

import { FormularioDaConta } from "./formulario";

export const dynamic = "force-dynamic";

/**
 * A conta da pessoa, espelho da edição de perfil do app: nome, telefone e
 * foto pela MESMA RPC (update_current_profile_customization), senha pela
 * recuperação, e a exclusão de conta pela mesma edge function. Página
 * neutra de fluxo: conta é da pessoa, não de um dos papéis.
 */
export default async function PaginaDaConta() {
  const contexto = await contextoLogado();
  const { data } = await contexto.supabase.rpc("fetch_current_profile");
  const linha = ((data as unknown[]) ?? [])[0] as
    | Record<string, unknown>
    | undefined;

  const nome = String(linha?.full_name ?? "");
  const telefone = String(linha?.phone ?? "");
  const email = String(linha?.email ?? contexto.usuario.email ?? "");
  const iniciais = String(linha?.initials ?? "?");
  const avatar = urlDoAvatar(
    linha?.avatar_url == null ? null : String(linha.avatar_url),
  );

  return (
    <main className="pagina">
      <div className="linha-topo">
        <Link href="/" className="marca marca-pequena">
          jurii<span className="ouro">.</span>
        </Link>
        <form action={sair}>
          <button type="submit" className="discreto">
            Sair
          </button>
        </form>
      </div>

      <h1>Sua conta</h1>
      <p className="subtitulo">
        A mesma conta do aplicativo: o que mudar aqui muda lá.
      </p>

      <FormularioDaConta
        nomeInicial={nome}
        telefoneInicial={telefone}
        email={email}
        iniciais={iniciais}
        avatarInicial={avatar}
      />

      <h2 className="secao">Senha</h2>
      <div className="cartao">
        <p className="detalhe" style={{ marginTop: 0 }}>
          A troca de senha passa pelo seu e-mail, para ninguém trocá-la por
          você.
        </p>
        <Link href="/recuperar" className="botao secundario">
          Redefinir senha por e-mail
        </Link>
      </div>
    </main>
  );
}
