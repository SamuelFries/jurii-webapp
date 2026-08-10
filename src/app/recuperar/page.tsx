"use client";

import Link from "next/link";
import { useState } from "react";

import { clienteDoNavegador } from "@/lib/supabase/navegador";

/**
 * Pede o e-mail de redefinição. O link do e-mail volta para /redefinir
 * NESTE domínio (a URL precisa estar na lista de redirecionamentos
 * permitidos do Supabase Auth; ver README).
 *
 * A resposta é a MESMA com e-mail cadastrado ou não: dizer "esse e-mail
 * não existe" entrega a lista de clientes de um escritório de advocacia
 * para quem quiser enumerar.
 */
export default function PaginaDeRecuperacao() {
  const [email, setEmail] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    setErro(null);

    const supabase = clienteDoNavegador();
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/redefinir`,
    });

    if (error && (error.message.includes("rate limit") || error.message.includes("Too many"))) {
      setErro("Muitas tentativas. Aguarde um instante e tente de novo.");
      setEnviando(false);
      return;
    }

    // Sucesso e "e-mail não existe" terminam iguais, de propósito.
    setEnviado(true);
    setEnviando(false);
  }

  return (
    <main className="pagina">
      <Link href="/entrar" className="marca marca-pequena">
        jurii<span className="ouro">.</span>
      </Link>
      <h1>Recuperar acesso</h1>
      <p className="subtitulo">
        Informe o e-mail da sua conta e enviaremos um link para redefinir a
        senha.
      </p>

      <div className="cartao">
        {enviado ? (
          <>
            <p>
              Se existir uma conta com esse e-mail, o link de redefinição já
              está a caminho. Confira também a caixa de spam.
            </p>
            <Link className="botao secundario" href="/entrar">
              Voltar para a entrada
            </Link>
          </>
        ) : (
          <form onSubmit={enviar}>
            <label htmlFor="email">E-mail</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(evento) => setEmail(evento.target.value)}
            />
            {erro !== null && <p className="erro">{erro}</p>}
            <button type="submit" disabled={enviando}>
              {enviando ? "Enviando..." : "Enviar link"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
