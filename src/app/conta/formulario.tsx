"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { nomeSeguro } from "@/lib/anexos";
import { clienteDoNavegador } from "@/lib/supabase/navegador";
import { nomeCompleto, telefoneValido } from "@/lib/validadores";

/**
 * Edição de nome, telefone e foto, o fluxo EXATO do app
 * (ProfileRepository.updateCustomization):
 *
 *  1. foto nova sobe primeiro para profile-avatars, na pasta do usuário
 *     (userId/avatar-{timestamp}-{nome});
 *  2. a RPC update_current_profile_customization grava tudo numa tacada,
 *     com avatar_action replace | remove | preserve;
 *  3. se a RPC falhar, o arquivo recém-subido é removido: nada de foto
 *     órfã no storage.
 *
 * A exclusão de conta chama a MESMA edge function do app (delete-account),
 * atrás de uma confirmação digitada: botão de apagar tudo não pode ser um
 * clique distraído.
 */
export function FormularioDaConta({
  nomeInicial,
  telefoneInicial,
  email,
  iniciais,
  avatarInicial,
}: {
  nomeInicial: string;
  telefoneInicial: string;
  email: string;
  iniciais: string;
  avatarInicial: string | null;
}) {
  const roteador = useRouter();
  const [nome, setNome] = useState(nomeInicial);
  const [telefone, setTelefone] = useState(telefoneInicial);
  const [fotoNova, setFotoNova] = useState<File | null>(null);
  const [removerFoto, setRemoverFoto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [confirmacaoDeExclusao, setConfirmacaoDeExclusao] = useState("");
  const [excluindo, setExcluindo] = useState(false);

  const previa =
    fotoNova !== null
      ? URL.createObjectURL(fotoNova)
      : removerFoto
        ? null
        : avatarInicial;

  async function salvar(evento: React.FormEvent) {
    evento.preventDefault();
    if (!nomeCompleto(nome)) {
      setErro("Informe nome e sobrenome.");
      return;
    }
    if (!telefoneValido(telefone)) {
      setErro("Informe um telefone com DDD, ou deixe em branco.");
      return;
    }
    if (fotoNova !== null && !fotoNova.type.startsWith("image/")) {
      setErro("A foto precisa ser uma imagem.");
      return;
    }
    if (fotoNova !== null && fotoNova.size > 5 * 1024 * 1024) {
      setErro("A foto passa de 5 MB. Reduza e tente de novo.");
      return;
    }

    setSalvando(true);
    setErro(null);
    setAviso(null);

    const supabase = clienteDoNavegador();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user === null) {
      setErro("Sua sessão expirou. Entre de novo.");
      setSalvando(false);
      return;
    }

    let caminhoDaFoto: string | null = null;
    if (fotoNova !== null) {
      caminhoDaFoto = `${user.id}/avatar-${Date.now() * 1000}-${nomeSeguro(fotoNova.name)}`;
      const { error: erroDeUpload } = await supabase.storage
        .from("profile-avatars")
        .upload(caminhoDaFoto, fotoNova, {
          contentType: fotoNova.type,
          upsert: false,
        });
      if (erroDeUpload) {
        setErro("Não foi possível enviar a foto. Tente de novo.");
        setSalvando(false);
        return;
      }
    }

    const { error: erroDaRpc } = await supabase.rpc(
      "update_current_profile_customization",
      {
        full_name_value: nome.trim(),
        phone_value: telefone.trim(),
        avatar_action_value:
          caminhoDaFoto !== null
            ? "replace"
            : removerFoto
              ? "remove"
              : "preserve",
        avatar_storage_path_value: caminhoDaFoto,
      },
    );

    if (erroDaRpc) {
      if (caminhoDaFoto !== null) {
        // Nada de foto órfã: o app faz o mesmo.
        await supabase.storage.from("profile-avatars").remove([caminhoDaFoto]);
      }
      setErro("Não foi possível salvar. Tente de novo.");
      setSalvando(false);
      return;
    }

    setAviso("Alterações salvas.");
    setFotoNova(null);
    setRemoverFoto(false);
    setSalvando(false);
    roteador.refresh();
  }

  async function excluirConta() {
    setExcluindo(true);
    setErro(null);
    const supabase = clienteDoNavegador();
    const { error } = await supabase.functions.invoke("delete-account");
    if (error) {
      setErro("Não foi possível excluir sua conta agora. Tente de novo.");
      setExcluindo(false);
      return;
    }
    await supabase.auth.signOut();
    roteador.push("/entrar");
    roteador.refresh();
  }

  return (
    <>
      <form onSubmit={salvar} className="cartao">
        <div className="linha-topo">
          <span className="avatar" aria-hidden style={{ width: 64, height: 64 }}>
            {previa !== null ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previa} alt="" />
            ) : (
              iniciais
            )}
          </span>
          <div className="acoes-do-topo">
            <label className="botao secundario" style={{ width: "auto", margin: 0 }}>
              Trocar foto
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                onChange={(evento) => {
                  const arquivo = evento.target.files?.[0] ?? null;
                  evento.target.value = "";
                  if (arquivo) {
                    setFotoNova(arquivo);
                    setRemoverFoto(false);
                  }
                }}
              />
            </label>
            {(avatarInicial !== null || fotoNova !== null) && !removerFoto && (
              <button
                type="button"
                className="discreto"
                onClick={() => {
                  setFotoNova(null);
                  setRemoverFoto(true);
                }}
              >
                Remover foto
              </button>
            )}
          </div>
        </div>

        <label htmlFor="nome">Nome completo</label>
        <input
          id="nome"
          type="text"
          autoComplete="name"
          required
          value={nome}
          onChange={(evento) => setNome(evento.target.value)}
        />

        <label htmlFor="telefone">Telefone (opcional)</label>
        <input
          id="telefone"
          type="text"
          inputMode="tel"
          autoComplete="tel"
          placeholder="(51) 99999-8888"
          value={telefone}
          onChange={(evento) => setTelefone(evento.target.value)}
        />

        <label htmlFor="email">E-mail</label>
        <input id="email" type="email" value={email} disabled />
        <p className="detalhe">
          O e-mail é o endereço da conta e não muda por aqui.
        </p>

        {erro !== null && <p className="erro">{erro}</p>}
        {aviso !== null && <p className="detalhe">{aviso}</p>}

        <button type="submit" disabled={salvando}>
          {salvando ? "Salvando..." : "Salvar alterações"}
        </button>
      </form>

      <h2 className="secao">Excluir conta</h2>
      <div className="cartao">
        <p className="detalhe" style={{ marginTop: 0 }}>
          Apaga sua conta e seus dados, como no aplicativo. Não tem volta.
          Digite <strong>excluir</strong> para liberar o botão.
        </p>
        <input
          type="text"
          aria-label="Digite excluir para confirmar"
          placeholder="excluir"
          value={confirmacaoDeExclusao}
          onChange={(evento) => setConfirmacaoDeExclusao(evento.target.value)}
        />
        <button
          type="button"
          className="secundario"
          style={{ color: "var(--danger)", borderColor: "var(--danger)" }}
          disabled={
            confirmacaoDeExclusao.trim().toLowerCase() !== "excluir" || excluindo
          }
          onClick={() => void excluirConta()}
        >
          {excluindo ? "Excluindo..." : "Excluir minha conta"}
        </button>
      </div>
    </>
  );
}
