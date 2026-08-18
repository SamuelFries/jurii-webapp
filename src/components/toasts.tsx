"use client";

import { useEffect } from "react";

/**
 * Faz de `.aviso-bom` e `.erro` (o feedback que 25 telas já renderizam via
 * `?ok=` / `?erro=` do servidor) um TOAST: aparece no canto, some sozinho.
 *
 * SEM MUDAR O MECANISMO. O servidor continua respondendo com redirect e query
 * param, e as telas continuam escrevendo o mesmo parágrafo. Este componente,
 * montado uma vez na casca, só encontra esses parágrafos depois da
 * hidratação, move-os para a pilha do canto e agenda a saída. Sem
 * JavaScript, o parágrafo fica onde sempre esteve: nada quebra.
 *
 * Erro NÃO some sozinho: erro precisa ser lido, e sumir antes de a pessoa
 * olhar seria pior do que ficar. Sucesso some em 4 s.
 */
const SELETOR =
  ".conteudo-de-trabalho .aviso-bom, .conteudo-de-trabalho p.erro";

export function Toasts() {
  useEffect(() => {
    const timers: number[] = [];
    // Os avisos que já viraram toast: o mesmo parágrafo não pode virar dois
    // toasts quando o observer dispara de novo por outra mutação.
    const vistos = new WeakSet<HTMLElement>();

    function pilha(): HTMLElement {
      let el = document.querySelector<HTMLElement>(".pilha-de-toasts");
      if (el === null) {
        el = document.createElement("div");
        el.className = "pilha-de-toasts";
        el.setAttribute("role", "status");
        el.setAttribute("aria-live", "polite");
        document.body.appendChild(el);
      }
      return el;
    }

    function processar() {
      const avisos = Array.from(
        document.querySelectorAll<HTMLElement>(SELETOR),
      ).filter(
        (el) =>
          !vistos.has(el) &&
          !el.closest(".pilha-de-toasts") &&
          el.dataset.fixo === undefined,
      );
      for (const aviso of avisos) {
        vistos.add(aviso);
        montarToast(aviso);
      }
    }

    function montarToast(aviso: HTMLElement) {
      const destino = pilha();
      const toast = document.createElement("div");
      toast.className = aviso.classList.contains("erro")
        ? "toast toast-erro"
        : "toast toast-ok";
      toast.textContent = aviso.textContent;

      const fechar = document.createElement("button");
      fechar.type = "button";
      fechar.className = "fechar-toast";
      fechar.setAttribute("aria-label", "Fechar aviso");
      fechar.textContent = "×";
      fechar.onclick = () => toast.remove();
      toast.appendChild(fechar);

      destino.appendChild(toast);
      aviso.style.display = "none";

      if (!aviso.classList.contains("erro")) {
        timers.push(
          window.setTimeout(() => {
            toast.classList.add("saindo");
            window.setTimeout(() => toast.remove(), 200);
          }, 4000),
        );
      }
    }

    // Roda já (a página pode ter hidratado antes) E a cada mutação: a casca
    // é layout e monta ANTES do conteúdo da rota, então o aviso da página
    // chega depois deste efeito. O observer é o que faz o toast funcionar
    // em qualquer ordem de montagem, e em toda navegação de cliente.
    processar();
    const observer = new MutationObserver(() => processar());
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  return null;
}
