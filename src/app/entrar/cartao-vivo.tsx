"use client";

import { useEffect, useRef } from "react";

/**
 * O cartão que responde à mão: inclina POUCOS graus na direção do cursor,
 * perspectiva de objeto físico. Só isso. A borda que acendia seguindo o
 * cursor morreu por feedback direto (virava luz perseguindo a mão); a
 * borda agora é serena e fixa, no CSS.
 *
 * Regras de casa:
 *  - `prefers-reduced-motion` desliga o tilt; o cartão fica parado.
 *  - Enquanto alguém DIGITA (foco em qualquer campo), o tilt congela em
 *    zero: mexer o chão de quem escreve é hostil, não charmoso.
 *  - Toque (sem cursor) nunca inclina.
 */
export function CartaoVivo({ children }: { children: React.ReactNode }) {
  const referencia = useRef<HTMLElement>(null);

  useEffect(() => {
    const cartao = referencia.current;
    if (cartao === null) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let focoDentro = false;
    let quadro = 0;

    function aoMover(evento: PointerEvent) {
      if (cartao === null || evento.pointerType !== "mouse") return;
      const caixa = cartao.getBoundingClientRect();
      const relativoX = (evento.clientX - caixa.left) / caixa.width;
      const relativoY = (evento.clientY - caixa.top) / caixa.height;

      window.cancelAnimationFrame(quadro);
      quadro = window.requestAnimationFrame(() => {
        if (cartao === null) return;
        if (focoDentro) {
          cartao.style.transform = "";
          return;
        }
        const dentroX = Math.min(Math.max(relativoX, -0.2), 1.2);
        const dentroY = Math.min(Math.max(relativoY, -0.2), 1.2);
        const giroY = (dentroX - 0.5) * 2.6; // graus
        const giroX = (0.5 - dentroY) * 2;
        cartao.style.transform = `perspective(1100px) rotateX(${giroX.toFixed(2)}deg) rotateY(${giroY.toFixed(2)}deg)`;
      });
    }

    function aoSair() {
      if (cartao === null) return;
      cartao.style.transform = "";
    }
    function aoFocar() {
      focoDentro = true;
      if (cartao !== null) cartao.style.transform = "";
    }
    function aoDesfocar() {
      focoDentro = false;
    }

    window.addEventListener("pointermove", aoMover);
    window.addEventListener("pointerleave", aoSair);
    cartao.addEventListener("focusin", aoFocar);
    cartao.addEventListener("focusout", aoDesfocar);
    return () => {
      window.cancelAnimationFrame(quadro);
      window.removeEventListener("pointermove", aoMover);
      window.removeEventListener("pointerleave", aoSair);
      cartao.removeEventListener("focusin", aoFocar);
      cartao.removeEventListener("focusout", aoDesfocar);
    };
  }, []);

  return (
    <main ref={referencia} className="cartao-de-entrada">
      {children}
    </main>
  );
}
