import type { FluxoDeTrabalho } from "./casca-de-trabalho";
import { ConversasComBusca } from "./listas/conversas-com-busca";
import type { FluxosDoUsuario } from "@/lib/fluxos";
import type { ConversaParaTela } from "@/lib/busca/filtros";

/**
 * O mestre-detalhe de mensagens da área de trabalho: a lista fica SEMPRE à
 * vista ao lado do chat aberto, porque trocar de conversa é o gesto mais
 * repetido do dia. O painel direito é de quem chama (chat, painel Hoje,
 * aviso de "escolha uma conversa").
 */
export function PainelDeMensagens({
  fluxo,
  fluxos,
  caminhoAtivo,
  titulo,
  subtitulo,
  conversas,
  baseHref,
  vazio,
  placeholder,
  rotuloNaoLidas,
  ativoId,
  hrefSufixo,
  cabecalhoDaLista,
  comDetalhe = false,
  children,
}: {
  fluxo: FluxoDeTrabalho;
  fluxos: FluxosDoUsuario;
  caminhoAtivo: string;
  titulo: string;
  subtitulo: string;
  conversas: ConversaParaTela[];
  baseHref: string;
  vazio: string;
  placeholder: string;
  rotuloNaoLidas?: string;
  ativoId?: string;
  hrefSufixo?: string;
  /** Ex.: o segmento Clientes | Equipe do escritório. */
  cabecalhoDaLista?: React.ReactNode;
  /** Em tela estreita, esconde a lista quando há detalhe aberto. */
  comDetalhe?: boolean;
  children: React.ReactNode;
}) {
  return (
      <div
        className={
          comDetalhe ? "painel-dividido com-detalhe" : "painel-dividido"
        }
      >
        <aside className="painel-lista">
          <h1>{titulo}</h1>
          <p className="subtitulo">{subtitulo}</p>
          {cabecalhoDaLista}
          <ConversasComBusca
            conversas={conversas}
            baseHref={baseHref}
            vazio={vazio}
            placeholder={placeholder}
            rotuloNaoLidas={rotuloNaoLidas}
            ativoId={ativoId}
            hrefSufixo={hrefSufixo}
          />
        </aside>
        <section className="painel-principal">{children}</section>
      </div>
  );
}

/** O mesmo mestre-detalhe, para casos: lista buscável à esquerda, detalhe
 * à direita. */
export function PainelDeCasos({
  fluxo,
  fluxos,
  caminhoAtivo,
  titulo,
  subtitulo,
  lista,
  comDetalhe = false,
  children,
}: {
  fluxo: FluxoDeTrabalho;
  fluxos: FluxosDoUsuario;
  caminhoAtivo: string;
  titulo: string;
  subtitulo: string;
  /** A lista buscável já montada (CasosDo*ComBusca com ativoId). */
  lista: React.ReactNode;
  comDetalhe?: boolean;
  children: React.ReactNode;
}) {
  return (
      <div
        className={
          comDetalhe ? "painel-dividido com-detalhe" : "painel-dividido"
        }
      >
        <aside className="painel-lista">
          <h1>{titulo}</h1>
          <p className="subtitulo">{subtitulo}</p>
          {lista}
        </aside>
        <section className="painel-principal">
          <div className="rolavel">{children}</div>
        </section>
      </div>
  );
}
