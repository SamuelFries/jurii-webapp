"use client";

import { useEffect, useRef, useState } from "react";

import { rotuloDeHorario } from "@/lib/dominio/conversas";
import { clienteDoNavegador } from "@/lib/supabase/navegador";

export interface MensagemParaTela {
  id: string;
  corpo: string;
  minha: boolean;
  criadaEmIso: string;
  apagadaParaTodos: boolean;
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
  const [erro, setErro] = useState<string | null>(null);
  const fimDaLista = useRef<HTMLDivElement>(null);

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
          const nova: MensagemParaTela = {
            id: String(linha.id),
            corpo: String(linha.body ?? ""),
            minha: String(linha.sender_id) === meuId,
            criadaEmIso: String(linha.created_at),
            apagadaParaTodos: linha.deleted_for_all_at != null,
          };
          setMensagens((atuais) =>
            atuais.some((mensagem) => mensagem.id === nova.id)
              ? atuais
              : [...atuais, nova],
          );
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
            },
          ],
    );
    setRascunho("");
    setEnviando(false);
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
            {mensagem.apagadaParaTodos ? "Mensagem apagada" : mensagem.corpo}
            <span className="horario">
              {rotuloDeHorario(new Date(mensagem.criadaEmIso), agora)}
            </span>
          </div>
        ))}
        <div ref={fimDaLista} />
      </div>

      {erro !== null && <p className="erro">{erro}</p>}

      <div className="caixa-de-envio">
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
