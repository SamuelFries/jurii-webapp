"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { clienteDoNavegador } from "@/lib/supabase/navegador";

/** Erros do Supabase Auth na língua de quem lê. O texto cru ("Invalid login
 * credentials") não pode vazar para a tela. */
function traduzErroDeLogin(mensagem: string): string {
  if (mensagem.includes("Invalid login credentials")) {
    return "E-mail ou senha incorretos.";
  }
  if (mensagem.includes("Email not confirmed")) {
    return "Confirme seu e-mail pelo link que enviamos antes de entrar.";
  }
  if (mensagem.includes("rate limit") || mensagem.includes("Too many")) {
    return "Muitas tentativas. Aguarde um instante e tente de novo.";
  }
  return "Não foi possível entrar. Verifique a conexão e tente de novo.";
}

export function FormularioDeEntrada() {
  const roteador = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [senhaVisivel, setSenhaVisivel] = useState(false);

  async function entrar(evento: React.FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    setErro(null);

    const supabase = clienteDoNavegador();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: senha,
    });

    if (error) {
      setErro(traduzErroDeLogin(error.message));
      setEnviando(false);
      return;
    }

    // A raiz roteia para o fluxo da pessoa (escritório > advogado >
    // cliente); refresh para as páginas do servidor relerem os cookies.
    roteador.push("/");
    roteador.refresh();
  }

  return (
    <form onSubmit={entrar}>
      <label htmlFor="email">E-mail</label>
      <input
        id="email"
        type="email"
        autoComplete="email"
        autoFocus
        enterKeyHint="next"
        required
        value={email}
        onChange={(evento) => setEmail(evento.target.value)}
      />

      <label htmlFor="senha">Senha</label>
      <div className="campo-de-senha">
        <input
          id="senha"
          type={senhaVisivel ? "text" : "password"}
          autoComplete="current-password"
          enterKeyHint="go"
          required
          value={senha}
          onChange={(evento) => setSenha(evento.target.value)}
        />
        <button
          type="button"
          className="olho-da-senha"
          onClick={() => setSenhaVisivel(!senhaVisivel)}
          aria-label={senhaVisivel ? "Ocultar senha" : "Mostrar senha"}
          aria-pressed={senhaVisivel}
        >
          {senhaVisivel ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M17.94 17.94A10.5 10.5 0 0 1 12 20C5 20 2 12 2 12a19 19 0 0 1 4.2-5.53M9.9 4.24A9.9 9.9 0 0 1 12 4c7 0 10 8 10 8a18.7 18.7 0 0 1-2.16 3.19" />
              <path d="M14.12 14.12A3 3 0 1 1 9.88 9.88" />
              <path d="m2 2 20 20" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M2 12s3-8 10-8 10 8 10 8-3 8-10 8-10-8-10-8Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>

      {erro !== null && (
        <p className="erro" role="alert">
          {erro}
        </p>
      )}

      <button
        type="submit"
        className="botao-de-entrar"
        disabled={enviando}
        aria-busy={enviando}
      >
        {enviando && <span className="giro" aria-hidden />}
        {enviando ? "Entrando..." : "Entrar"}
      </button>

      <a href="/recuperar" className="esqueci-a-senha">
        Esqueci minha senha
      </a>

      <div className="divisor-da-entrada">
        <span>Ainda não tem conta?</span>
      </div>
      <a href="/criar-conta" className="botao secundario">
        Criar conta
      </a>
    </form>
  );
}
