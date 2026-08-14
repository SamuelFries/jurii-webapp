import { ConversasComBusca } from "./listas/conversas-com-busca";
import type { ConversaParaTela } from "@/lib/busca/filtros";

/**
 * O mestre-detalhe de mensagens da área de trabalho: a lista fica SEMPRE à
 * vista ao lado do chat aberto, porque trocar de conversa é o gesto mais
 * repetido do dia. O painel direito é de quem chama (chat, painel Hoje,
 * aviso de "escolha uma conversa").
 *
 * SÓ O MIOLO: `fluxo`, `fluxos` e `caminhoAtivo` saíram quando a casca virou
 * layout de segmento. Eram três props que todo chamador preenchia e o corpo
 * nunca lia, e `caminhoAtivo` guardado sem uso é pior que ausente: na
 * migração da rota do escritório ele ficou apontando para caminhos velhos
 * sem que nada quebrasse, porque quem acende a lateral é o layout.
 */
export function PainelDeMensagens({
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
 * à direita. Também só o miolo, pelo motivo acima. */
export function PainelDeCasos({
  titulo,
  subtitulo,
  lista,
  comDetalhe = false,
  children,
}: {
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
