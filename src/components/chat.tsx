"use client";

import { useEffect, useRef, useState } from "react";

import { caminhoDoAnexo, validaAnexo } from "@/lib/anexos";
import { rotuloDeHorario } from "@/lib/dominio/conversas";
import { clienteDoNavegador } from "@/lib/supabase/navegador";

export interface AnexoParaTela {
  nome: string;
  tipoMime: string;
  /** Assinada por 1h; nula quando o servidor não conseguiu assinar. */
  url: string | null;
}

export interface MensagemParaTela {
  id: string;
  corpo: string;
  minha: boolean;
  criadaEmIso: string;
  apagadaParaTodos: boolean;
  tipo: "texto" | "anexo" | "solicitacao_de_caso";
  anexo: AnexoParaTela | null;
}

/**
 * O chat, com o MESMO contrato do app (chat_screen.dart):
 * histórico das 100 mais recentes, envio por insert em `messages` (a RLS
 * decide quem pode), sender_type 'client' ou 'lawyer' conforme o fluxo, e
 * mark_conversation_read ao abrir e ao receber com a tela aberta.
 *
 * Tempo real: assina INSERT em messages desta conversa. Chegou mensagem de
 * outra pessoa, entra na lista e é marcada como lida na hora, porque a
 * pessoa ESTÁ olhando; as minhas já entraram no envio (o eco do canal é
 * deduplicado pelo id).
 */
export function Chat({
  conversaId,
  meuId,
  senderType,
  mensagensIniciais,
}: {
  conversaId: string;
  meuId: string;
  senderType: "client" | "lawyer";
  mensagensIniciais: MensagemParaTela[];
}) {
  const [mensagens, setMensagens] = useState(mensagensIniciais);
  const [rascunho, setRascunho] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [subindoAnexo, setSubindoAnexo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const fimDaLista = useRef<HTMLDivElement>(null);
  const seletorDeArquivo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const supabase = clienteDoNavegador();

    // Abrir a conversa É a leitura.
    void supabase.rpc("mark_conversation_read", {
      conversation_id_value: conversaId,
    });

    const canal = supabase
      .channel(`web_chat_${conversaId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversaId}`,
        },
        (evento) => {
          const linha = evento.new as Record<string, unknown>;
          const metadata = (linha.metadata ?? {}) as Record<string, unknown>;
          const tipo =
            metadata.type === "chat_attachment"
              ? "anexo"
              : metadata.type === "case_request"
                ? "solicitacao_de_caso"
                : "texto";
          const nova: MensagemParaTela = {
            id: String(linha.id),
            corpo: String(linha.body ?? ""),
            minha: String(linha.sender_id) === meuId,
            criadaEmIso: String(linha.created_at),
            apagadaParaTodos: linha.deleted_for_all_at != null,
            tipo,
            anexo: null,
          };
          setMensagens((atuais) =>
            atuais.some((mensagem) => mensagem.id === nova.id)
              ? atuais
              : [...atuais, nova],
          );
          if (tipo === "anexo") {
            // O conteúdo mora em message_attachments: busca e assina, e a
            // bolha troca o "Anexo" seco pelo arquivo de verdade.
            void (async () => {
              const { data: anexo } = await supabase
                .from("message_attachments")
                .select("file_name, mime_type, storage_path")
                .eq("message_id", String(linha.id))
                .maybeSingle();
              if (!anexo) return;
              const { data: assinada } = await supabase.storage
                .from("chat-attachments")
                .createSignedUrl(String(anexo.storage_path), 3600);
              setMensagens((atuais) =>
                atuais.map((mensagem) =>
                  mensagem.id === String(linha.id)
                    ? {
                        ...mensagem,
                        anexo: {
                          nome: String(anexo.file_name ?? "arquivo"),
                          tipoMime: String(anexo.mime_type ?? ""),
                          url: assinada?.signedUrl ?? null,
                        },
                      }
                    : mensagem,
                ),
              );
            })();
          }
          if (!nova.minha) {
            void supabase.rpc("mark_conversation_read", {
              conversation_id_value: conversaId,
            });
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(canal);
    };
  }, [conversaId, meuId]);

  useEffect(() => {
    fimDaLista.current?.scrollIntoView({ block: "end" });
  }, [mensagens.length]);

  async function enviar() {
    const corpo = rascunho.trim();
    if (corpo === "" || enviando) return;
    setEnviando(true);
    setErro(null);

    const supabase = clienteDoNavegador();
    const { data, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversaId,
        sender_id: meuId,
        sender_type: senderType,
        body: corpo,
      })
      .select("id, body, sender_id, created_at, deleted_for_all_at")
      .single();

    if (error || data === null) {
      setErro("A mensagem não foi enviada. Verifique a conexão e tente de novo.");
      setEnviando(false);
      return;
    }

    setMensagens((atuais) =>
      atuais.some((mensagem) => mensagem.id === String(data.id))
        ? atuais
        : [
            ...atuais,
            {
              id: String(data.id),
              corpo: String(data.body),
              minha: true,
              criadaEmIso: String(data.created_at),
              apagadaParaTodos: false,
              tipo: "texto",
              anexo: null,
            },
          ],
    );
    setRascunho("");
    setEnviando(false);
  }

  /**
   * O MESMO fluxo do app: sobe para chat-attachments (na pasta do próprio
   * usuário, que a RPC exige), registra por send_chat_attachment e, se a
   * RPC recusar, REMOVE o arquivo órfão do storage. A validação local só
   * evita subir 10 MB para ouvir não: quem manda é o servidor.
   */
  async function enviarAnexo(arquivo: File) {
    const veredito = validaAnexo(arquivo.type, arquivo.size);
    if ("erro" in veredito) {
      setErro(veredito.erro);
      return;
    }
    setSubindoAnexo(true);
    setErro(null);

    const supabase = clienteDoNavegador();
    const caminho = caminhoDoAnexo(
      meuId,
      conversaId,
      arquivo.name,
      Date.now() * 1000,
    );

    const { error: erroDeUpload } = await supabase.storage
      .from("chat-attachments")
      .upload(caminho, arquivo, { contentType: arquivo.type, upsert: false });
    if (erroDeUpload) {
      setErro("Não foi possível enviar o arquivo. Tente de novo.");
      setSubindoAnexo(false);
      return;
    }

    const { data, error: erroDaRpc } = await supabase.rpc(
      "send_chat_attachment",
      {
        conversation_id_value: conversaId,
        file_name_value: arquivo.name,
        mime_type_value: arquivo.type,
        file_size_bytes_value: arquivo.size,
        storage_path_value: caminho,
        kind_value: veredito.kind,
        sender_type_value: senderType,
      },
    );

    if (erroDaRpc || data == null) {
      // Arquivo sem registro é órfão: limpa, como o app faz.
      await supabase.storage.from("chat-attachments").remove([caminho]);
      setErro("O servidor recusou o anexo. Confira o tipo e o tamanho.");
      setSubindoAnexo(false);
      return;
    }

    const linha = (data as Record<string, unknown>[])[0] ?? {};
    const idDaMensagem = String(linha.id ?? linha.message_id ?? "");
    const { data: assinada } = await supabase.storage
      .from("chat-attachments")
      .createSignedUrl(caminho, 3600);

    if (idDaMensagem !== "") {
      setMensagens((atuais) =>
        atuais.some((mensagem) => mensagem.id === idDaMensagem)
          ? atuais.map((mensagem) =>
              mensagem.id === idDaMensagem && mensagem.anexo === null
                ? {
                    ...mensagem,
                    anexo: {
                      nome: arquivo.name,
                      tipoMime: arquivo.type,
                      url: assinada?.signedUrl ?? null,
                    },
                  }
                : mensagem,
            )
          : [
              ...atuais,
              {
                id: idDaMensagem,
                corpo: "",
                minha: true,
                criadaEmIso: new Date().toISOString(),
                apagadaParaTodos: false,
                tipo: "anexo",
                anexo: {
                  nome: arquivo.name,
                  tipoMime: arquivo.type,
                  url: assinada?.signedUrl ?? null,
                },
              },
            ],
      );
    }
    setSubindoAnexo(false);
  }

  const agora = new Date();

  return (
    <>
      <div className="chat">
        {mensagens.length === 0 && (
          <p className="vazio">Nenhuma mensagem ainda. Comece a conversa.</p>
        )}
        {mensagens.map((mensagem) => (
          <div
            key={mensagem.id}
            className={[
              "bolha",
              mensagem.minha ? "minha" : "deles",
              mensagem.apagadaParaTodos ? "apagada" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <CorpoDaMensagem mensagem={mensagem} />
            <span className="horario">
              {rotuloDeHorario(new Date(mensagem.criadaEmIso), agora)}
            </span>
          </div>
        ))}
        <div ref={fimDaLista} />
      </div>

      {erro !== null && <p className="erro">{erro}</p>}

      <div className="caixa-de-envio">
        <input
          ref={seletorDeArquivo}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf,.doc,.docx"
          hidden
          onChange={(evento) => {
            const arquivo = evento.target.files?.[0];
            evento.target.value = "";
            if (arquivo) void enviarAnexo(arquivo);
          }}
        />
        <button
          type="button"
          className="secundario botao-de-anexo"
          onClick={() => seletorDeArquivo.current?.click()}
          disabled={subindoAnexo}
          aria-label="Anexar arquivo"
          title="Anexar imagem ou documento"
        >
          {subindoAnexo ? "…" : "📎"}
        </button>
        <textarea
          rows={2}
          placeholder="Escreva sua mensagem"
          aria-label="Escreva sua mensagem"
          value={rascunho}
          onChange={(evento) => setRascunho(evento.target.value)}
          onKeyDown={(evento) => {
            if (evento.key === "Enter" && !evento.shiftKey) {
              evento.preventDefault();
              void enviar();
            }
          }}
        />
        <button type="button" onClick={() => void enviar()} disabled={enviando}>
          Enviar
        </button>
      </div>
    </>
  );
}

/** O conteúdo da bolha conforme o tipo. Mensagem de anexo NUNCA vira bolha
 * vazia: o corpo dela é vazio de verdade (o conteúdo mora no storage), e
 * bolha em branco parece defeito. */
function CorpoDaMensagem({ mensagem }: { mensagem: MensagemParaTela }) {
  if (mensagem.apagadaParaTodos) return <>Mensagem apagada</>;

  if (mensagem.tipo === "anexo") {
    if (mensagem.anexo === null) return <>Anexo</>;
    const ehImagem =
      mensagem.anexo.tipoMime.startsWith("image/") &&
      mensagem.anexo.url !== null;
    if (ehImagem) {
      return (
        <a href={mensagem.anexo.url!} target="_blank" rel="noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mensagem.anexo.url!}
            alt={mensagem.anexo.nome}
            className="imagem-do-anexo"
          />
        </a>
      );
    }
    if (mensagem.anexo.url !== null) {
      return (
        <a
          href={mensagem.anexo.url}
          target="_blank"
          rel="noreferrer"
          className="ficha-de-anexo"
        >
          {mensagem.anexo.nome}
        </a>
      );
    }
    return <>Anexo: {mensagem.anexo.nome}</>;
  }

  if (mensagem.tipo === "solicitacao_de_caso") {
    return (
      <>
        <span className="selo-de-solicitacao">Solicitação de caso</span>
        {mensagem.corpo !== "" && <span>{mensagem.corpo}</span>}
        <span className="dica-de-solicitacao">
          O cliente responde em Meus casos.
        </span>
      </>
    );
  }

  return <>{mensagem.corpo}</>;
}
