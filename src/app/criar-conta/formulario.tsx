"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { clienteDoNavegador } from "@/lib/supabase/navegador";
import {
  cpfValido,
  mascaraDeCpf,
  nomeCompleto,
  somenteDigitos,
  tamanhoMinimoDeSenha,
} from "@/lib/validadores";

/** A frase que o banco levanta no gatilho de auth.users. */
const RECADO_DESCARTAVEL =
  "Use um e-mail permanente. Endereços descartáveis não são aceitos: " +
  "é por ele que você recupera a senha e recebe aviso de movimentação.";

function traduzErroDeCadastro(mensagem: string): string {
  if (mensagem.includes("Disposable email domains are not allowed")) {
    return RECADO_DESCARTAVEL;
  }
  if (mensagem.includes("already registered")) {
    return "Já existe uma conta com esse e-mail. Entre ou recupere a senha.";
  }
  if (mensagem.includes("rate limit") || mensagem.includes("Too many")) {
    return "Muitas tentativas. Aguarde um instante e tente de novo.";
  }
  if (mensagem.includes("invalid") && mensagem.includes("email")) {
    return "Esse e-mail não parece válido. Confira e tente de novo.";
  }
  return "Não foi possível criar a conta. Verifique a conexão e tente de novo.";
}

export function FormularioDeCadastro({ depois = "/" }: { depois?: string }) {
  const roteador = useRouter();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [confirmarEmail, setConfirmarEmail] = useState(false);

  async function cadastrar(evento: React.FormEvent) {
    evento.preventDefault();

    // As MESMAS validações do app (lib/utils/validators.dart): aceitar aqui
    // um cadastro que o app recusaria seria ter duas réguas.
    if (!nomeCompleto(nome)) {
      setErro("Informe nome e sobrenome.");
      return;
    }
    if (!cpfValido(cpf)) {
      setErro("Informe um CPF válido.");
      return;
    }
    if (senha.length < tamanhoMinimoDeSenha) {
      setErro(`Use pelo menos ${tamanhoMinimoDeSenha} caracteres na senha.`);
      return;
    }
    if (senha !== confirmacao) {
      setErro("As senhas não conferem.");
      return;
    }

    setEnviando(true);
    setErro(null);

    const supabase = clienteDoNavegador();

    // Pergunta ANTES de enviar, para a pessoa ler o motivo em vez de um erro
    // de servidor. A barreira de verdade é o gatilho em auth.users (a chave
    // anon é pública: cadastro por curl contornaria qualquer tela). Se a
    // consulta falhar, segue o cadastro: quem decide é o banco.
    try {
      const { data: descartavel } = await supabase.rpc("email_e_descartavel", {
        email_value: email.trim(),
      });
      if (descartavel === true) {
        setErro(RECADO_DESCARTAVEL);
        setEnviando(false);
        return;
      }
    } catch {
      // sem rede para checar: o servidor decide
    }

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: senha,
      options: {
        // O gatilho do banco cria o perfil a partir destes metadados, o
        // mesmo contrato do app.
        data: { full_name: nome.trim(), cpf: somenteDigitos(cpf) },
        emailRedirectTo: `${window.location.origin}/entrar`,
      },
    });

    if (error) {
      setErro(traduzErroDeCadastro(error.message));
      setEnviando(false);
      return;
    }

    // Com confirmação de e-mail ligada, a sessão só nasce depois do clique
    // no link; sem confirmação, a pessoa já entra.
    if (data.session === null) {
      setConfirmarEmail(true);
      setEnviando(false);
      return;
    }

    // `depois` devolve quem veio de um link (convite de equipe) para onde
    // estava — saneado no servidor. Quem cai na confirmação de e-mail reabre
    // o link do convite depois; ele continua válido.
    roteador.push(depois);
    roteador.refresh();
  }

  if (confirmarEmail) {
    return (
      <p>
        Conta criada. Enviamos um link de confirmação para o seu e-mail;
        depois de confirmar, é só entrar.
      </p>
    );
  }

  return (
    <form onSubmit={cadastrar}>
      <label htmlFor="nome">Nome completo</label>
      <input
        id="nome"
        type="text"
        autoComplete="name"
        required
        value={nome}
        onChange={(evento) => setNome(evento.target.value)}
      />

      <label htmlFor="email">E-mail</label>
      <input
        id="email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(evento) => setEmail(evento.target.value)}
      />

      <label htmlFor="cpf">CPF</label>
      <input
        id="cpf"
        type="text"
        inputMode="numeric"
        autoComplete="off"
        required
        placeholder="000.000.000-00"
        value={cpf}
        onChange={(evento) => setCpf(mascaraDeCpf(evento.target.value))}
      />

      <label htmlFor="senha">Senha</label>
      <input
        id="senha"
        type="password"
        autoComplete="new-password"
        required
        minLength={tamanhoMinimoDeSenha}
        value={senha}
        onChange={(evento) => setSenha(evento.target.value)}
      />

      <label htmlFor="confirmacao">Repita a senha</label>
      <input
        id="confirmacao"
        type="password"
        autoComplete="new-password"
        required
        value={confirmacao}
        onChange={(evento) => setConfirmacao(evento.target.value)}
      />

      {erro !== null && <p className="erro">{erro}</p>}

      <button type="submit" disabled={enviando}>
        {enviando ? "Criando conta..." : "Criar conta"}
      </button>
    </form>
  );
}
