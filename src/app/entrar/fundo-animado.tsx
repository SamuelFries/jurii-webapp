"use client";

import { useEffect, useRef } from "react";

/**
 * O fundo da entrada: espectros de luz sobre o azul do Jurii.
 *
 * Três orbes difusos (dourado, azul-claro e um pálido) perseguem o cursor
 * com atrasos diferentes, como se a luz demorasse a entender para onde a
 * mão foi; ao redor, um véu de partículas deriva devagar e as que estão
 * perto do cursor se ligam por filamentos que se formam e se desfazem.
 *
 * Regras de casa:
 *  - `prefers-reduced-motion` desliga TUDO que se move: fica o gradiente
 *    parado com os orbes em posição fixa. Animação é cortesia, não pedágio.
 *  - Aba escondida pausa o laço (requestAnimationFrame já garante).
 *  - Sem cursor (toque), os orbes vagueiam sozinhos num passeio lento.
 */
export function FundoAnimado() {
  const referencia = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const tela = referencia.current;
    if (tela === null) return;
    const contexto = tela.getContext("2d");
    if (contexto === null) return;

    const semMovimento = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let largura = 0;
    let altura = 0;
    let quadro = 0;

    const escala = Math.min(window.devicePixelRatio || 1, 2);
    function dimensiona() {
      if (tela === null) return;
      largura = window.innerWidth;
      altura = window.innerHeight;
      tela.width = Math.floor(largura * escala);
      tela.height = Math.floor(altura * escala);
      contexto?.setTransform(escala, 0, 0, escala, 0, 0);
    }
    dimensiona();

    // O alvo começa no centro e passa a ser o cursor quando ele existir.
    const alvo = { x: largura / 2, y: altura * 0.42 };
    let temCursor = false;

    interface Orbe {
      x: number;
      y: number;
      atraso: number;
      raio: number;
      cor: string;
      fase: number;
    }

    // Cores da marca em véu: dourado, azul do tema claro e um pálido.
    const orbes: Orbe[] = [
      { x: alvo.x, y: alvo.y, atraso: 0.045, raio: 300, cor: "184,151,42", fase: 0 },
      { x: alvo.x, y: alvo.y, atraso: 0.022, raio: 380, cor: "90,130,200", fase: 2.1 },
      { x: alvo.x, y: alvo.y, atraso: 0.012, raio: 320, cor: "238,241,248", fase: 4.2 },
    ];

    const particulas = Array.from({ length: 56 }, (_, indice) => ({
      x: ((indice * 379) % 1000) / 1000,
      y: ((indice * 631) % 1000) / 1000,
      vx: (((indice * 7) % 10) - 5) / 55,
      vy: (((indice * 13) % 10) - 5) / 55,
    }));

    function pinta(tempo: number) {
      if (contexto === null) return;
      contexto.clearRect(0, 0, largura, altura);

      // Os orbes: perseguem o alvo com atrasos diferentes; sem cursor,
      // passeiam num laço lento ao redor do centro.
      for (const orbe of orbes) {
        const passeioX = temCursor
          ? 0
          : Math.cos(tempo / 4200 + orbe.fase) * largura * 0.18;
        const passeioY = temCursor
          ? 0
          : Math.sin(tempo / 5100 + orbe.fase) * altura * 0.14;
        const destinoX = alvo.x + passeioX;
        const destinoY = alvo.y + passeioY;

        if (semMovimento) {
          orbe.x = destinoX;
          orbe.y = destinoY;
        } else {
          orbe.x += (destinoX - orbe.x) * orbe.atraso;
          orbe.y += (destinoY - orbe.y) * orbe.atraso;
        }

        const brilho = contexto.createRadialGradient(
          orbe.x,
          orbe.y,
          0,
          orbe.x,
          orbe.y,
          orbe.raio,
        );
        brilho.addColorStop(0, `rgba(${orbe.cor},0.16)`);
        brilho.addColorStop(1, `rgba(${orbe.cor},0)`);
        contexto.fillStyle = brilho;
        contexto.fillRect(0, 0, largura, altura);
      }

      // O véu de partículas e os filamentos perto do cursor.
      const alcance = 170;
      for (const particula of particulas) {
        if (!semMovimento) {
          particula.x += particula.vx / largura;
          particula.y += particula.vy / altura;
          if (particula.x < 0) particula.x += 1;
          if (particula.x > 1) particula.x -= 1;
          if (particula.y < 0) particula.y += 1;
          if (particula.y > 1) particula.y -= 1;
        }
        const x = particula.x * largura;
        const y = particula.y * altura;

        contexto.fillStyle = "rgba(238,241,248,0.35)";
        contexto.fillRect(x, y, 1.6, 1.6);

        const distanciaX = x - alvo.x;
        const distanciaY = y - alvo.y;
        const distancia = Math.hypot(distanciaX, distanciaY);
        if (distancia < alcance) {
          const forca = 1 - distancia / alcance;
          contexto.strokeStyle = `rgba(212,177,74,${0.28 * forca})`;
          contexto.lineWidth = 1;
          contexto.beginPath();
          contexto.moveTo(x, y);
          contexto.lineTo(alvo.x, alvo.y);
          contexto.stroke();
        }
      }
    }

    function laco(tempo: number) {
      pinta(tempo);
      quadro = window.requestAnimationFrame(laco);
    }

    function aoMoverCursor(evento: PointerEvent) {
      temCursor = true;
      alvo.x = evento.clientX;
      alvo.y = evento.clientY;
    }

    window.addEventListener("resize", dimensiona);
    if (semMovimento) {
      // Um único quadro parado: composição presente, movimento nenhum.
      pinta(0);
    } else {
      window.addEventListener("pointermove", aoMoverCursor);
      quadro = window.requestAnimationFrame(laco);
    }

    return () => {
      window.cancelAnimationFrame(quadro);
      window.removeEventListener("resize", dimensiona);
      window.removeEventListener("pointermove", aoMoverCursor);
    };
  }, []);

  return <canvas ref={referencia} className="fundo-da-entrada" aria-hidden />;
}
