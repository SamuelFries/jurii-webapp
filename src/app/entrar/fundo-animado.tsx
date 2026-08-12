"use client";

import { useEffect, useRef } from "react";

/**
 * O fundo da entrada: espectros de luz sobre o azul do Jurii.
 *
 * Três orbes difusos (dourado, azul-claro e um pálido) perseguem o cursor
 * com atrasos diferentes, como se a luz demorasse a entender para onde a
 * mão foi. Ao redor, uma CONSTELAÇÃO: partículas de brilho oscilante que
 * derivam devagar, se ligam por filamentos quando se aproximam umas das
 * outras, e acendem filamentos dourados perto do cursor. Os orbes pintam
 * em composição aditiva (luz soma, não cobre) e uma vinheta escura fecha
 * as bordas para o olho ficar no cartão.
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

    const particulas = Array.from({ length: 64 }, (_, indice) => ({
      x: ((indice * 379) % 1000) / 1000,
      y: ((indice * 631) % 1000) / 1000,
      vx: (((indice * 7) % 10) - 5) / 55,
      vy: (((indice * 13) % 10) - 5) / 55,
      tamanho: 1.1 + ((indice * 17) % 3) * 0.55,
      fase: ((indice * 97) % 628) / 100,
    }));

    function pinta(tempo: number) {
      if (contexto === null) return;
      contexto.clearRect(0, 0, largura, altura);

      // Luz soma, não cobre: os orbes em composição aditiva ganham o
      // brilho de projetor que a composição normal achata.
      contexto.globalCompositeOperation = "lighter";

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
        brilho.addColorStop(0, `rgba(${orbe.cor},0.20)`);
        brilho.addColorStop(1, `rgba(${orbe.cor},0)`);
        contexto.fillStyle = brilho;
        contexto.fillRect(0, 0, largura, altura);
      }

      contexto.globalCompositeOperation = "source-over";

      // A constelação: cada partícula deriva, cintila com fase própria e
      // guarda a posição do quadro para os filamentos.
      const alcance = 170;
      const pontos: { x: number; y: number }[] = [];
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
        pontos.push({ x, y });

        const cintilo = semMovimento
          ? 0.35
          : 0.26 + 0.18 * Math.sin(tempo / 900 + particula.fase);
        contexto.fillStyle = `rgba(238,241,248,${cintilo.toFixed(3)})`;
        contexto.beginPath();
        contexto.arc(x, y, particula.tamanho / 2, 0, Math.PI * 2);
        contexto.fill();

        const distancia = Math.hypot(x - alvo.x, y - alvo.y);
        if (distancia < alcance) {
          const forca = 1 - distancia / alcance;
          contexto.strokeStyle = `rgba(212,177,74,${(0.3 * forca).toFixed(3)})`;
          contexto.lineWidth = 1;
          contexto.beginPath();
          contexto.moveTo(x, y);
          contexto.lineTo(alvo.x, alvo.y);
          contexto.stroke();
        }
      }

      // Filamentos ENTRE partículas próximas: é isso que faz o fundo
      // parecer um organismo, e não confete. 64 pontos = ~2k pares, nada.
      const vizinhanca = 110;
      for (let a = 0; a < pontos.length; a += 1) {
        for (let b = a + 1; b < pontos.length; b += 1) {
          const dx = pontos[a].x - pontos[b].x;
          if (dx > vizinhanca || dx < -vizinhanca) continue;
          const dy = pontos[a].y - pontos[b].y;
          if (dy > vizinhanca || dy < -vizinhanca) continue;
          const distancia = Math.hypot(dx, dy);
          if (distancia >= vizinhanca) continue;
          const forca = 1 - distancia / vizinhanca;
          contexto.strokeStyle = `rgba(180,198,232,${(0.10 * forca).toFixed(3)})`;
          contexto.lineWidth = 0.8;
          contexto.beginPath();
          contexto.moveTo(pontos[a].x, pontos[a].y);
          contexto.lineTo(pontos[b].x, pontos[b].y);
          contexto.stroke();
        }
      }

      // A vinheta fecha as bordas e devolve o olho ao cartão.
      const vinheta = contexto.createRadialGradient(
        largura / 2,
        altura * 0.46,
        Math.min(largura, altura) * 0.32,
        largura / 2,
        altura * 0.46,
        Math.max(largura, altura) * 0.78,
      );
      vinheta.addColorStop(0, "rgba(4,10,24,0)");
      vinheta.addColorStop(1, "rgba(4,10,24,0.42)");
      contexto.fillStyle = vinheta;
      contexto.fillRect(0, 0, largura, altura);
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
