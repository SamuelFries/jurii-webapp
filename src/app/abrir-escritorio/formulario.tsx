"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { areasDoDireito } from "@/lib/dominio/areas";
import {
  documentoDoEscritorio,
  mascaraDeCnpj,
  nomeSeguroDeArquivo,
  validaEscritorio,
  type ProblemaDaVerificacao,
} from "@/lib/dominio/verificacao";
import { clienteDoNavegador } from "@/lib/supabase/navegador";

import { buscaEndereco } from "./acoes";

/**
 * Abrir escritório: o pedido é um INSERT em law_firm_verifications, o mesmo
 * caminho do app. A policy exige owner_profile_id = auth.uid() e status
 * pendente, então quem decide é o banco.
 */
export function FormularioDeEscritorio({ usuarioId }: { usuarioId: string }) {
  const roteador = useRouter();
  const [nome, setNome] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [cep, setCep] = useState("");
  const [endereco, setEndereco] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [areas, setAreas] = useState<string[]>([]);
  const [foto, setFoto] = useState<File | null>(null);
  const [coordenada, setCoordenada] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [problemas, setProblemas] = useState<ProblemaDaVerificacao[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const problemaDe = (campo: string) =>
    problemas.find((problema) => problema.campo === campo)?.mensagem;

  /** Sair do campo do CEP preenche o endereço, como no app. */
  async function completaPeloCep() {
    const digitos = cep.replace(/\D/g, "");
    if (digitos.length !== 8) return;
    setBuscandoCep(true);
    const achado = await buscaEndereco(digitos, numero);
    setBuscandoCep(false);
    if (achado === null) return;
    if (endereco.trim() === "") setEndereco(achado.endereco);
    setCoordenada(
      achado.latitude !== null && achado.longitude !== null
        ? { latitude: achado.latitude, longitude: achado.longitude }
        : null,
    );
  }

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setErro(null);

    const encontrados = validaEscritorio({
      nome,
      cnpj,
      telefone,
      email,
      cep,
      areas,
      foto: foto === null ? null : { tamanho: foto.size, mime: foto.type },
    });
    setProblemas(encontrados);
    if (encontrados.length > 0) return;

    setEnviando(true);
    const supabase = clienteDoNavegador();
    const digitos = cep.replace(/\D/g, "");

    const { data, error } = await supabase
      .from("law_firm_verifications")
      .insert({
        owner_profile_id: usuarioId,
        firm_name: nome.trim(),
        cnpj: cnpj.replace(/\D/g, ""),
        phone: telefone.trim(),
        email: email.trim(),
        address: endereco.trim(),
        ...(numero.trim() !== "" ? { address_number: numero.trim() } : {}),
        ...(complemento.trim() !== ""
          ? { address_complement: complemento.trim() }
          : {}),
        ...(digitos.length === 8 ? { cep: digitos } : {}),
        // AOS PARES: o banco tem check `(latitude is null) = (longitude is
        // null)`, e mandar uma sozinha derruba o cadastro inteiro por causa
        // de um enfeite.
        ...(coordenada !== null
          ? { latitude: coordenada.latitude, longitude: coordenada.longitude }
          : {}),
        practice_areas: areas,
        status: "pending",
      })
      .select("id")
      .single();

    if (error || data == null) {
      setEnviando(false);
      setErro(
        "Não foi possível enviar o pedido. Confira os dados e tente de novo.",
      );
      return;
    }

    const verificacaoId = String(data.id);

    if (foto !== null) {
      const micros = Date.now() * 1000;
      const caminho = `${usuarioId}/${verificacaoId}/avatar-${micros}-${nomeSeguroDeArquivo(foto.name)}`;
      const envio = await supabase.storage
        .from("law-firm-avatars")
        .upload(caminho, foto, { contentType: foto.type, upsert: false });
      if (envio.error) {
        // O pedido JÁ FOI criado; a foto é a única parte que falhou. Falhar
        // em silêncio aqui mandava o pedido sem imagem e ninguém sabia.
        setEnviando(false);
        setErro(
          "O pedido foi enviado, mas a foto não subiu. Reenvie o pedido com a foto para a análise ver o escritório.",
        );
        return;
      }
      const vinculo = await supabase.rpc(
        "set_current_law_firm_verification_avatar",
        {
          verification_id_value: verificacaoId,
          storage_path_value: caminho,
        },
      );
      if (vinculo.error) {
        await supabase.storage.from("law-firm-avatars").remove([caminho]);
        setEnviando(false);
        setErro(
          "O pedido foi enviado, mas a foto não ficou vinculada. Reenvie com a foto.",
        );
        return;
      }
    }

    roteador.push("/abrir-escritorio?ok=enviado");
    roteador.refresh();
  }

  return (
    <form onSubmit={enviar}>
      <h2 className="secao">Dados do escritório</h2>
      <label htmlFor="nome">Nome do escritório</label>
      <input
        id="nome"
        type="text"
        value={nome}
        onChange={(evento) => setNome(evento.target.value)}
        placeholder="Ex.: Fries Advogados Associados"
      />
      {problemaDe("nome") !== undefined && (
        <p className="erro">{problemaDe("nome")}</p>
      )}

      <label htmlFor="cnpj">CNPJ</label>
      <input
        id="cnpj"
        type="text"
        inputMode="numeric"
        value={cnpj}
        onChange={(evento) => setCnpj(mascaraDeCnpj(evento.target.value))}
        placeholder="00.000.000/0000-00"
      />
      {problemaDe("cnpj") !== undefined && (
        <p className="erro">{problemaDe("cnpj")}</p>
      )}

      <div className="acoes-em-linha">
        <div style={{ flex: 1 }}>
          <label htmlFor="telefone">Telefone</label>
          <input
            id="telefone"
            type="text"
            inputMode="tel"
            value={telefone}
            onChange={(evento) => setTelefone(evento.target.value)}
            placeholder="(51) 3333-0000"
          />
          {problemaDe("telefone") !== undefined && (
            <p className="erro">{problemaDe("telefone")}</p>
          )}
        </div>
        <div style={{ flex: 1 }}>
          <label htmlFor="email">E-mail</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(evento) => setEmail(evento.target.value)}
          />
          {problemaDe("email") !== undefined && (
            <p className="erro">{problemaDe("email")}</p>
          )}
        </div>
      </div>

      <div className="acoes-em-linha">
        <div style={{ flex: "0 0 170px" }}>
          <label htmlFor="cep">CEP</label>
          <input
            id="cep"
            type="text"
            inputMode="numeric"
            maxLength={9}
            value={cep}
            onChange={(evento) => setCep(evento.target.value)}
            onBlur={() => void completaPeloCep()}
            placeholder="90540-140"
          />
          {problemaDe("cep") !== undefined && (
            <p className="erro">{problemaDe("cep")}</p>
          )}
        </div>
        <div style={{ flex: 1 }}>
          <label htmlFor="endereco">
            Endereço {buscandoCep && <span className="detalhe">buscando...</span>}
          </label>
          <input
            id="endereco"
            type="text"
            value={endereco}
            onChange={(evento) => setEndereco(evento.target.value)}
            placeholder="Preenche sozinho pelo CEP"
          />
        </div>
      </div>

      <div className="acoes-em-linha">
        <div style={{ flex: "0 0 140px" }}>
          <label htmlFor="numero">Número</label>
          <input
            id="numero"
            type="text"
            value={numero}
            onChange={(evento) => setNumero(evento.target.value)}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label htmlFor="complemento">Complemento</label>
          <input
            id="complemento"
            type="text"
            value={complemento}
            onChange={(evento) => setComplemento(evento.target.value)}
            placeholder="Sala 1102"
          />
        </div>
      </div>

      <h2 className="secao">Áreas atendidas</h2>
      <div className="grade-de-areas">
        {areasDoDireito.map((area) => (
          <label key={area} className="area-marcavel">
            <input
              type="checkbox"
              checked={areas.includes(area)}
              onChange={(evento) =>
                setAreas((atuais) =>
                  evento.target.checked
                    ? [...atuais, area]
                    : atuais.filter((item) => item !== area),
                )
              }
            />
            {area}
          </label>
        ))}
      </div>
      {problemaDe("areas") !== undefined && (
        <p className="erro">{problemaDe("areas")}</p>
      )}

      <h2 className="secao">Foto</h2>
      <div className="cartao">
        <strong>{documentoDoEscritorio.titulo}</strong>
        <p className="detalhe" style={{ marginTop: 2 }}>
          {documentoDoEscritorio.detalhe}
        </p>
        <input
          id="foto-do-escritorio"
          className="arquivo-escondido"
          type="file"
          accept={documentoDoEscritorio.aceita}
          onChange={(evento) => setFoto(evento.target.files?.[0] ?? null)}
        />
        <div className="escolha-de-arquivo">
          <label
            className="botao secundario compacto"
            htmlFor="foto-do-escritorio"
          >
            {foto === null ? "Escolher arquivo" : "Trocar arquivo"}
          </label>
          <span className="detalhe">
            {foto?.name ?? "Nenhum arquivo escolhido"}
          </span>
        </div>
        {problemaDe("foto") !== undefined && (
          <p className="erro">{problemaDe("foto")}</p>
        )}
      </div>

      {erro !== null && (
        <p className="erro" role="alert">
          {erro}
        </p>
      )}

      <button type="submit" disabled={enviando}>
        {enviando ? "Enviando..." : "Enviar pedido"}
      </button>
    </form>
  );
}
