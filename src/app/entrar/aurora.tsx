"use client";

import { useEffect, useRef } from "react";

/**
 * A aurora do Jurii: cortinas de luz navy e UMA dourada, ondulando devagar
 * atrás do vidro, com pó dourado subindo como poeira em contraluz.
 *
 * O conceito anterior (orbes que perseguiam o cursor) morreu por feedback
 * direto: virava um clarão branco andando pela tela. Aqui a paleta é
 * FECHADA nas cores da casa (navy, azul-aço e dourado; branco não pinta
 * nada) e o movimento é ambiente: lento, contínuo, indiferente à mão. A
 * única concessão ao cursor é um parallax de poucos pixels na cena
 * inteira, profundidade, não perseguição.
 *
 * Técnica: as cortinas são desenhadas num canvas PEQUENO (240x135) que o
 * CSS estica com blur; borrão de graça, sem pagar blur em resolução cheia.
 * O pó mora num segundo canvas, em resolução cheia, para ficar nítido.
 *
 * Regras de casa: `prefers-reduced-motion` congela tudo num único quadro
 * bonito (a composição fica, o movimento não) e desliga o parallax.
 */
export function Aurora() {
  const cena = useRef<HTMLDivElement>(null);
  const ceuRef = useRef<HTMLCanvasElement>(null);
  const poRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const ceu = ceuRef.current;
    const po = poRef.current;
    const palco = cena.current;
    if (ceu === null || po === null || palco === null) return;
    const tintaCeu = ceu.getContext("2d");
    const tintaPo = po.getContext("2d");
    if (tintaCeu === null || tintaPo === null) return;

    const semMovimento = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    // O céu é minúsculo de propósito: o CSS estica e borra.
    const CW = 240;
    const CH = 135;
    ceu.width = CW;
    ceu.height = CH;

    let largura = 0;
    let altura = 0;
    function dimensiona() {
      largura = window.innerWidth;
      altura = window.innerHeight;
      if (po === null) return;
      po.width = largura;
      po.height = altura;
    }
    dimensiona();

    interface Cortina {
      cor: string;
      base: number; // fração da altura
      amp1: number;
      amp2: number;
      f1: number;
      f2: number;
      v1: number;
      v2: number;
      espessura: number;
      /** Multiplicador de presença: a dourada pode falar um pouco mais
       * alto sem precisar levantar as azuis junto. */
      voz: number;
    }

    // Duas cortinas azuis, uma navy funda e UMA dourada, mais baixa e
    // tímida: a assinatura da casa, não um holofote.
    const cortinas: Cortina[] = [
      { cor: "70,115,205", base: 0.26, amp1: 18, amp2: 9, f1: 0.020, f2: 0.043, v1: 0.00016, v2: 0.00009, espessura: 46, voz: 1 },
      { cor: "40,80,170", base: 0.50, amp1: 24, amp2: 11, f1: 0.014, f2: 0.033, v1: 0.00011, v2: 0.00014, espessura: 60, voz: 1 },
      { cor: "105,150,225", base: 0.13, amp1: 12, amp2: 6, f1: 0.027, f2: 0.051, v1: 0.00019, v2: 0.00007, espessura: 30, voz: 1 },
      { cor: "212,177,74", base: 0.66, amp1: 16, amp2: 8, f1: 0.017, f2: 0.039, v1: 0.00009, v2: 0.00012, espessura: 46, voz: 1.5 },
    ];

    function pintaCeu(tempo: number) {
      if (tintaCeu === null) return;
      tintaCeu.clearRect(0, 0, CW, CH);
      tintaCeu.globalCompositeOperation = "lighter";
      for (const cortina of cortinas) {
        const baseY = cortina.base * CH;
        tintaCeu.beginPath();
        tintaCeu.moveTo(-4, CH + 4);
        for (let x = -4; x <= CW + 4; x += 6) {
          const y =
            baseY +
            Math.sin(x * cortina.f1 + tempo * cortina.v1) * cortina.amp1 +
            Math.sin(x * cortina.f2 - tempo * cortina.v2) * cortina.amp2;
          tintaCeu.lineTo(x, y);
        }
        tintaCeu.lineTo(CW + 4, CH + 4);
        tintaCeu.closePath();
        const degrade = tintaCeu.createLinearGradient(0, baseY - 40, 0, CH);
        degrade.addColorStop(0, `rgba(${cortina.cor},0)`);
        degrade.addColorStop(0.22, `rgba(${cortina.cor},${(0.26 * cortina.voz).toFixed(3)})`);
        degrade.addColorStop(0.55, `rgba(${cortina.cor},${(0.09 * cortina.voz).toFixed(3)})`);
        degrade.addColorStop(1, `rgba(${cortina.cor},0)`);
        tintaCeu.fillStyle = degrade;
        tintaCeu.fill();
      }
      tintaCeu.globalCompositeOperation = "source-over";
    }

    // O pó dourado: nasce embaixo, sobe devagar, respira no brilho e
    // recomeça. Nada branco, nada rápido.
    const graos = Array.from({ length: 42 }, (_, indice) => ({
      x: ((indice * 379) % 1000) / 1000,
      y: ((indice * 631) % 1000) / 1000,
      subida: 7 + ((indice * 13) % 9), // px/s
      deriva: (((indice * 7) % 10) - 5) * 0.9,
      fase: ((indice * 97) % 628) / 100,
      tamanho: 1 + ((indice * 17) % 12) / 9,
    }));

    let ultimoTempo = 0;
    function pintaPo(tempo: number) {
      if (tintaPo === null) return;
      const passo = ultimoTempo === 0 ? 0 : (tempo - ultimoTempo) / 1000;
      ultimoTempo = tempo;
      tintaPo.clearRect(0, 0, largura, altura);
      for (const grao of graos) {
        if (!semMovimento) {
          grao.y -= (grao.subida * passo) / altura;
          grao.x += (Math.sin(tempo / 4000 + grao.fase) * grao.deriva * passo) / largura;
          if (grao.y < -0.02) {
            grao.y = 1.02;
            grao.x = ((grao.x * 997) % 1000) / 1000;
          }
        }
        const brilho = 0.10 + 0.22 * Math.abs(Math.sin(tempo / 1600 + grao.fase));
        tintaPo.fillStyle = `rgba(212,177,74,${brilho.toFixed(3)})`;
        tintaPo.beginPath();
        tintaPo.arc(grao.x * largura, grao.y * altura, grao.tamanho, 0, Math.PI * 2);
        tintaPo.fill();
      }
    }

    // Parallax de ambiente: a cena inteira desliza poucos pixels, com
    // preguiça. Profundidade, não perseguição.
    const alvo = { x: 0, y: 0 };
    const atual = { x: 0, y: 0 };
    function aoMover(evento: PointerEvent) {
      alvo.x = (evento.clientX / largura - 0.5) * 14;
      alvo.y = (evento.clientY / altura - 0.5) * 10;
    }

    let quadro = 0;
    function laco(tempo: number) {
      pintaCeu(tempo);
      pintaPo(tempo);
      atual.x += (alvo.x - atual.x) * 0.03;
      atual.y += (alvo.y - atual.y) * 0.03;
      if (palco !== null) {
        palco.style.transform = `translate3d(${atual.x.toFixed(2)}px, ${atual.y.toFixed(2)}px, 0)`;
      }
      quadro = window.requestAnimationFrame(laco);
    }

    window.addEventListener("resize", dimensiona);
    if (semMovimento) {
      pintaCeu(9000);
      pintaPo(9000);
    } else {
      window.addEventListener("pointermove", aoMover);
      quadro = window.requestAnimationFrame(laco);
    }

    return () => {
      window.cancelAnimationFrame(quadro);
      window.removeEventListener("resize", dimensiona);
      window.removeEventListener("pointermove", aoMover);
    };
  }, []);

  return (
    <div ref={cena} className="fundo-aurora" aria-hidden>
      <canvas ref={ceuRef} className="ceu-da-aurora" />
      <canvas ref={poRef} className="po-da-aurora" />
    </div>
  );
}
