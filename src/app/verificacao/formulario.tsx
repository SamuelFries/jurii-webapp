"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { areasDoDireito } from "@/lib/dominio/areas";
import {
  caminhoDoDocumento,
  documentosDaVerificacao,
  estadosDaOab,
  numeroDaOab,
  validaVerificacao,
  type ProblemaDaVerificacao,
} from "@/lib/dominio/verificacao";
import { clienteDoNavegador } from "@/lib/supabase/navegador";

/**
 * O envio da verificação, na ORDEM que o app usa: primeiro a RPC, que cria
 * a linha e devolve o id, e só depois os arquivos.
 *
 * A ordem importa: se o upload falhar, existe uma verificação sem
 * documento, que o analista vê e pode pedir de novo. Ao contrário, arquivo
 * subiria para uma verificação que não existe, e viraria lixo invisível no
 * bucket.
 */
export function FormularioDeVerificacao({ usuarioId }: { usuarioId: string }) {
  const roteador = useRouter();
  const [oab, setOab] = useState("");
  const [estado, setEstado] = useState("");
  const [areaPrincipal, setAreaPrincipal] = useState("");
  const [areas, setAreas] = useState<string[]>([]);
  const [arquivos, setArquivos] = useState<Record<string, File>>({});
  const [problemas, setProblemas] = useState<ProblemaDaVerificacao[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const problemaDe = (campo: string) =>
    problemas.find((problema) => problema.campo === campo)?.mensagem;

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setErro(null);

    const escolhidas =
      areas.length > 0 ? areas : [areaPrincipal].filter(Boolean);
    const encontrados = validaVerificacao({
      oab,
      estado,
      areaPrincipal,
      areas: escolhidas,
      documentos: Object.entries(arquivos).map(([tipo, arquivo]) => ({
        tipo,
        tamanho: arquivo.size,
        mime: arquivo.type,
      })),
    });
    setProblemas(encontrados);
    if (encontrados.length > 0) return;

    setEnviando(true);
    const supabase = clienteDoNavegador();

    const { data, error } = await supabase.rpc("submit_lawyer_verification", {
      oab_number_value: numeroDaOab(oab),
      oab_state_value: estado,
      practice_area_value: areaPrincipal,
      practice_areas_value: escolhidas,
    });

    if (error) {
      setEnviando(false);
      setErro(
        "Não foi possível enviar a verificação agora. Confira os dados e tente de novo.",
      );
      return;
    }

    const linha = ((data as unknown[]) ?? [])[0] as
      Record<string, unknown> | undefined;
    const verificacaoId = linha?.id == null ? null : String(linha.id);

    if (verificacaoId !== null) {
      for (const exigido of documentosDaVerificacao) {
        const arquivo = arquivos[exigido.tipo];
        if (arquivo === undefined) continue;
        const caminho = caminhoDoDocumento(
          usuarioId,
          exigido.tipo,
          arquivo.name,
          Date.now() * 1000,
        );
        const envio = await supabase.storage
          .from("verification-documents")
          .upload(caminho, arquivo, {
            contentType: arquivo.type,
            upsert: false,
          });
        if (envio.error) continue;

        await supabase.from("verification_documents").insert({
          verification_id: verificacaoId,
          user_id: usuarioId,
          document_type: exigido.tipo,
          title: exigido.titulo,
          storage_path: caminho,
          mime_type: arquivo.type,
          size_bytes: arquivo.size,
        });

        // A foto profissional TAMBÉM vira o avatar público do perfil, como
        // no app: quem aprova já vê o rosto que o cliente vai ver.
        if (exigido.tipo === "professional_photo") {
          const caminhoDoAvatar = `${usuarioId}/avatar-${Date.now() * 1000}-${arquivo.name.replace(/[^A-Za-z0-9._-]+/g, "_")}`;
          const avatar = await supabase.storage
            .from("profile-avatars")
            .upload(caminhoDoAvatar, arquivo, {
              contentType: arquivo.type,
              upsert: true,
            });
          if (!avatar.error) {
            await supabase.rpc("update_current_profile_customization", {
              full_name_value: null,
              phone_value: null,
              avatar_action_value: "replace",
              avatar_storage_path_value: caminhoDoAvatar,
            });
          }
        }
      }
    }

    roteador.push("/verificacao?ok=enviada");
    roteador.refresh();
  }

  return (
    <form onSubmit={enviar}>
      <h2 className="secao">Dados profissionais</h2>
      <div className="acoes-em-linha">
        <div style={{ flex: 1 }}>
          <label htmlFor="oab">Número da OAB</label>
          <input
            id="oab"
            type="text"
            inputMode="numeric"
            value={oab}
            onChange={(evento) => setOab(evento.target.value)}
            placeholder="123456"
          />
          {problemaDe("oab") !== undefined && (
            <p className="erro">{problemaDe("oab")}</p>
          )}
        </div>
        <div style={{ flex: "0 0 140px" }}>
          <label htmlFor="estado">Seccional</label>
          <select
            id="estado"
            value={estado}
            onChange={(evento) => setEstado(evento.target.value)}
          >
            <option value="">UF</option>
            {estadosDaOab.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </select>
          {problemaDe("estado") !== undefined && (
            <p className="erro">{problemaDe("estado")}</p>
          )}
        </div>
      </div>

      <h2 className="secao">Áreas de atuação</h2>
      <label htmlFor="area-principal">Área principal</label>
      <select
        id="area-principal"
        value={areaPrincipal}
        onChange={(evento) => setAreaPrincipal(evento.target.value)}
      >
        <option value="">Escolha uma área</option>
        {areasDoDireito.map((area) => (
          <option key={area} value={area}>
            {area}
          </option>
        ))}
      </select>
      {problemaDe("area") !== undefined && (
        <p className="erro">{problemaDe("area")}</p>
      )}

      <details className="propor-caso" style={{ marginTop: 10 }}>
        <summary>Também atendo em (opcional)</summary>
        <div className="grade-de-areas" style={{ marginTop: 8 }}>
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
      </details>

      <h2 className="secao">Documentos</h2>
      <p className="detalhe">
        Os documentos ficam em área privada e servem só para a análise. A foto
        profissional é a exceção: ela vira a imagem do seu perfil.
      </p>
      {documentosDaVerificacao.map((documento) => (
        <div key={documento.tipo} className="cartao" style={{ marginTop: 10 }}>
          <strong>{documento.titulo}</strong>
          <p className="detalhe" style={{ marginTop: 2 }}>
            {documento.detalhe}
          </p>
          {/* O input nativo fica escondido (mas alcançável pelo rótulo e
              pelo teclado): o botão dele vem escrito "Choose File", em
              inglês, e o navegador não deixa traduzir. */}
          <input
            id={`arquivo-${documento.tipo}`}
            className="arquivo-escondido"
            type="file"
            accept={documento.aceita}
            onChange={(evento) => {
              const arquivo = evento.target.files?.[0];
              setArquivos((atuais) => {
                const proximos = { ...atuais };
                if (arquivo) proximos[documento.tipo] = arquivo;
                else delete proximos[documento.tipo];
                return proximos;
              });
            }}
          />
          <div className="escolha-de-arquivo">
            <label
              className="botao secundario compacto"
              htmlFor={`arquivo-${documento.tipo}`}
            >
              {arquivos[documento.tipo] === undefined
                ? "Escolher arquivo"
                : "Trocar arquivo"}
            </label>
            <span className="detalhe">
              {arquivos[documento.tipo]?.name ?? "Nenhum arquivo escolhido"}
            </span>
          </div>
          {problemaDe(documento.tipo) !== undefined && (
            <p className="erro">{problemaDe(documento.tipo)}</p>
          )}
        </div>
      ))}

      {erro !== null && (
        <p className="erro" role="alert">
          {erro}
        </p>
      )}

      <button type="submit" disabled={enviando}>
        {enviando ? "Enviando..." : "Enviar para análise"}
      </button>
    </form>
  );
}
