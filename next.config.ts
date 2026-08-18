import type { NextConfig } from "next";

/**
 * A Content-Security-Policy do webapp.
 *
 * `script-src` aceita 'unsafe-inline' de propósito, e a razão é honesta: o
 * Next injeta os dados de hidratação em <script> inline, e a alternativa
 * (nonce por requisição no middleware) exigiria abrir mão do cache de
 * rota. O valor real desta política está nas OUTRAS diretivas, que fecham
 * portas que nada aqui precisa:
 *
 *  - connect-src: o navegador só fala com a própria origem e com o
 *    Supabase. Dado exfiltrado para outro host esbarra aqui;
 *  - form-action: formulário só posta para a própria origem, o que corta
 *    o sequestro de <form> por injeção;
 *  - base-uri: sem isto, uma <base> injetada reescreve TODO caminho
 *    relativo da página, inclusive para onde os formulários vão;
 *  - object-src / frame-ancestors: nada de plugin, nada de moldura (o
 *    X-Frame-Options continua para navegador antigo).
 */
const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://*.supabase.co";

const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  // blob: e data: aparecem em pré-visualização de anexo antes do envio.
  `img-src 'self' data: blob: ${supabase}`,
  "font-src 'self' data:",
  // O WebSocket do realtime acompanha o esquema do Supabase: wss:// quando o
  // host é https (produção), ws:// quando é http (o Supabase LOCAL, em
  // 127.0.0.1). Antes era wss:// fixo, e no ambiente local a CSP bloqueava o
  // realtime em silêncio: a prova de scroll do chat "passava" porque a
  // mensagem nova nunca chegava. Em produção nada muda.
  `connect-src 'self' ${supabase} ${supabase.startsWith("http://") ? "ws" : "wss"}://${supabase.replace(/^https?:\/\//, "")}`,
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Fora do índice até o lançamento: página de gestão logada não é
          // superfície de marketing (essa é a jurii.com.br).
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Content-Security-Policy", value: csp },
          // O HSTS de jurii.com.br já usa includeSubDomains, então o
          // navegador que passou pela landing já exige HTTPS aqui. Este
          // repete para quem chega direto no subdomínio.
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          // Nada disto é usado; negar evita que uma dependência futura
          // peça em silêncio.
          {
            key: "Permissions-Policy",
            value:
              "geolocation=(), camera=(), microphone=(), usb=(), payment=(), interest-cohort=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
