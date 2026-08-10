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
        required
        value={email}
        onChange={(evento) => setEmail(evento.target.value)}
      />

      <label htmlFor="senha">Senha</label>
      <input
        id="senha"
        type="password"
        autoComplete="current-password"
        required
        value={senha}
        onChange={(evento) => setSenha(evento.target.value)}
      />

      {erro !== null && <p className="erro">{erro}</p>}

      <button type="submit" disabled={enviando}>
        {enviando ? "Entrando..." : "Entrar"}
      </button>

      <p className="detalhe">
        Ainda não tem conta? Ela é criada no aplicativo Jurii, junto com o
        cadastro do escritório.
      </p>
    </form>
  );
}
