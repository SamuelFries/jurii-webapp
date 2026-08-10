"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { clienteDoNavegador } from "@/lib/supabase/navegador";

/**
 * Destino do link de redefinição. O link chega com ?code=; o código vira
 * uma sessão de recuperação e a pessoa define a senha nova. Sem código e
 * sem sessão, a página diz o que fazer em vez de falhar em silêncio.
 */
export default function PaginaDeRedefinicao() {
  const roteador = useRouter();
  const [pronto, setPronto] = useState(false);
  const [semLink, setSemLink] = useState(false);
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    const supabase = clienteDoNavegador();
    const codigo = new URLSearchParams(window.location.search).get("code");

    async function prepara() {
      if (codigo !== null) {
        const { error } = await supabase.auth.exchangeCodeForSession(codigo);
        if (error) {
          setSemLink(true);
          return;
        }
        setPronto(true);
        return;
      }
      // Sem código na URL: só serve se já houver sessão (recarregou a
      // página depois da troca, por exemplo).
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user !== null) setPronto(true);
      else setSemLink(true);
    }

    void prepara();
  }, []);

  async function salvar(evento: React.FormEvent) {
    evento.preventDefault();
    if (senha.length < 8) {
      setErro("A senha precisa de pelo menos 8 caracteres.");
      return;
    }
    if (senha !== confirmacao) {
      setErro("As senhas não conferem.");
      return;
    }
    setSalvando(true);
    setErro(null);

    const supabase = clienteDoNavegador();
    const { error } = await supabase.auth.updateUser({ password: senha });

    if (error) {
      setErro(
        error.message.includes("should be different")
          ? "A senha nova precisa ser diferente da atual."
          : "Não foi possível salvar a senha. Tente de novo.",
      );
      setSalvando(false);
      return;
    }

    roteador.push("/");
    roteador.refresh();
  }

  return (
    <main className="pagina">
      <Link href="/entrar" className="marca marca-pequena">
        jurii<span className="ouro">.</span>
      </Link>
      <h1>Nova senha</h1>

      <div className="cartao">
        {semLink ? (
          <>
            <p>
              Este link de redefinição expirou ou já foi usado. Peça um novo
              para continuar.
            </p>
            <Link className="botao secundario" href="/recuperar">
              Pedir novo link
            </Link>
          </>
        ) : !pronto ? (
          <p className="detalhe">Validando o link...</p>
        ) : (
          <form onSubmit={salvar}>
            <label htmlFor="senha">Nova senha</label>
            <input
              id="senha"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={senha}
              onChange={(evento) => setSenha(evento.target.value)}
            />
            <label htmlFor="confirmacao">Repita a nova senha</label>
            <input
              id="confirmacao"
              type="password"
              autoComplete="new-password"
              required
              value={confirmacao}
              onChange={(evento) => setConfirmacao(evento.target.value)}
            />
            {erro !== null && <p className="erro">{erro}</p>}
            <button type="submit" disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar e entrar"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
