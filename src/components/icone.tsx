/**
 * Os ícones da casa: SVG inline, traço único, 20px por padrão.
 *
 * SEM BIBLIOTECA de propósito. O webapp não usa Tailwind nem shadcn, e trazer
 * lucide (ou qualquer pacote) por dezoito desenhos seria a primeira
 * dependência visual de terceiro num projeto que se manteve inteiro em CSS
 * próprio. Dezoito paths cabem num arquivo, renderizam no servidor sem
 * JavaScript, e herdam `currentColor`: pintam da cor do texto ao lado, no
 * claro e no escuro, sem regra extra.
 *
 * Traço 1.75 e cantos redondos: leve o bastante para não brigar com o texto
 * de 14px da lateral, firme o bastante para escanear.
 */
export type NomeDoIcone =
  | "visao"
  | "mensagens"
  | "casos"
  | "equipe"
  | "alcance"
  | "perfil"
  | "notificacoes"
  | "assinatura"
  | "agenda"
  | "verificacoes"
  | "historico"
  | "denuncias"
  | "escritorio"
  | "advogado"
  | "abrir"
  | "conta"
  | "ajuda"
  | "sair"
  | "seta-direita"
  | "seta-baixo"
  | "busca"
  | "fechar"
  | "check"
  | "alerta"
  | "info"
  | "copiar"
  | "documento"
  | "relogio";

const CAMINHOS: Record<NomeDoIcone, string> = {
  visao: "M3 13h8V3H3v10zm10 8h8V11h-8v10zM3 21h8v-6H3v6zm10-18v6h8V3h-8z",
  mensagens: "M21 12a8 8 0 0 1-11.6 7.1L4 20l1.1-4.4A8 8 0 1 1 21 12z",
  casos: "M4 7h16v13H4zM9 7V4h6v3M4 12h16",
  equipe: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8",
  alcance: "M22 12h-4l-3 9L9 3l-3 9H2",
  perfil: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  notificacoes: "M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0",
  assinatura: "M2 7h20v10H2zM2 11h20M6 15h4",
  agenda: "M4 5h16v16H4zM4 10h16M8 3v4M16 3v4",
  verificacoes: "M9 12l2 2 4-4M12 22c5.5-2 8-6 8-12V5l-8-3-8 3v5c0 6 2.5 10 8 12z",
  historico: "M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2",
  denuncias: "M4 22V4a1 1 0 0 1 1-1h12l-2 4 2 4H5M4 15h11",
  escritorio: "M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6M9 10h.01M15 10h.01M9 13h.01M15 13h.01",
  advogado: "M12 3l8 4-8 4-8-4 8-4zM4 11l8 4 8-4M4 15l8 4 8-4",
  abrir: "M12 5v14M5 12h14",
  conta: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z",
  ajuda: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01",
  sair: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
  "seta-direita": "M9 18l6-6-6-6",
  "seta-baixo": "M6 9l6 6 6-6",
  busca: "M21 21l-4.3-4.3M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z",
  fechar: "M18 6L6 18M6 6l12 12",
  check: "M20 6L9 17l-5-5",
  alerta: "M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z",
  info: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 16v-4M12 8h.01",
  copiar: "M8 8h12v12H8zM16 8V4H4v12h4",
  documento: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8",
  relogio: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2",
};

export function Icone({
  nome,
  tamanho = 20,
  className,
}: {
  nome: NomeDoIcone;
  tamanho?: number;
  className?: string;
}) {
  return (
    <svg
      className={className}
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={CAMINHOS[nome]} />
    </svg>
  );
}
