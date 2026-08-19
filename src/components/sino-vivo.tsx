"use client";

import { useEffect, useRef, useState } from "react";

import { clienteDoNavegador } from "@/lib/supabase/navegador";

/**
 * O sino que não precisa de recarregar.
 *
 * Numa ferramenta que fica aberta o dia inteiro, o pior comportamento é o
 * de antes: a contagem só mudava quando a pessoa navegava, então uma
 * mensagem que chegou às 10h só aparecia quando ela clicasse em algo às
 * 11h. Aqui a linha nova chega por tempo real (a tabela `notifications`
 * está na publicação, e a RLS filtra por destinatário: cada um recebe só
 * o que é dele).
 *
 * TRÊS CUIDADOS para isso ajudar em vez de incomodar:
 *
 *  1. O TÍTULO DA ABA leva a contagem, porque quem trabalha com muitas
 *     abas descobre pelo título, não pelo pixel do sino.
 *  2. O AVISO DO SISTEMA só dispara com a aba ESCONDIDA. Notificar o que a
 *     pessoa está olhando é ruído puro.
 *  3. A PERMISSÃO nunca é pedida sozinha ao abrir. Diálogo do navegador
 *     sem contexto é quase sempre negado, e negado é para sempre; aqui ele
 *     só aparece depois de um clique em "Avisar quando chegar".
 */
export function SinoVivo({
  escopo,
  lawFirmId,
  inicial,
}: {
  escopo: "lawyer" | "firm";
  lawFirmId: string | null;
  inicial: number;
}) {
  const [naoLidas, setNaoLidas] = useState(inicial);
  const [permissao, setPermissao] = useState<NotificationPermission | "indisponivel">(
    "default",
  );
  const tituloOriginal = useRef<string>("");

  // A contagem do servidor manda quando a página troca: uma navegação
  // reflete leituras feitas em outro lugar (o celular, outra aba).
  useEffect(() => setNaoLidas(inicial), [inicial]);

  useEffect(() => {
    setPermissao(
      typeof Notification === "undefined" ? "indisponivel" : Notification.permission,
    );
    if (tituloOriginal.current === "") tituloOriginal.current = document.title;
  }, []);

  useEffect(() => {
    const base = tituloOriginal.current || "Jurii";
    document.title = naoLidas > 0 ? `(${naoLidas}) ${base}` : base;
  }, [naoLidas]);

  useEffect(() => {
    const supabase = clienteDoNavegador();
    const canal = supabase
      .channel(`sino_${escopo}_${lawFirmId ?? "eu"}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `scope=eq.${escopo}`,
        },
        (evento) => {
          const linha = evento.new as Record<string, unknown>;
          // O escritório recebe por escritório: sem este corte, quem é
          // sócio de dois veria o sino do outro piscar aqui.
          if (
            escopo === "firm" &&
            lawFirmId !== null &&
            String(linha.law_firm_id ?? "") !== lawFirmId
          ) {
            return;
          }
          setNaoLidas((atual) => atual + 1);

          if (
            typeof Notification !== "undefined" &&
            Notification.permission === "granted" &&
            document.hidden
          ) {
            const aviso = new Notification(String(linha.title ?? "Jurii"), {
              body: String(linha.body ?? ""),
              // A mesma tag substitui o aviso anterior em vez de empilhar
              // dez balões quando chega uma conversa movimentada.
              tag: `jurii-${escopo}`,
              icon: "/marca/jurii-lockup-empilhado-escuro.png",
            });
            aviso.onclick = () => {
              window.focus();
              aviso.close();
            };
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(canal);
    };
  }, [escopo, lawFirmId]);

  async function pedirPermissao() {
    if (typeof Notification === "undefined") return;
    setPermissao(await Notification.requestPermission());
  }

  return (
    <>
      {naoLidas > 0 && (
        <span
          className="pilula-nao-lidas"
          title={
            naoLidas === 1
              ? "1 notificação não lida"
              : `${naoLidas} notificações não lidas`
          }
          aria-label={
            naoLidas === 1
              ? "1 notificação não lida"
              : `${naoLidas} notificações não lidas`
          }
        >
          {naoLidas > 99 ? "99+" : naoLidas}
        </span>
      )}
      {permissao === "default" && (
        <button
          type="button"
          className="pedir-aviso"
          onClick={() => void pedirPermissao()}
          title="Receber aviso do sistema quando chegar mensagem, mesmo com a aba no fundo"
        >
          Avisar quando chegar
        </button>
      )}
    </>
  );
}
