export interface ItemDaLateral {
  rotulo: string;
  href: string;
  /** Prefixos de rota que também acendem este item. */
  tambem?: string[];
  /**
   * Índice de seção: acende só no caminho EXATO.
   *
   * Todo item cuja rota é a RAIZ de uma seção precisa disto, porque a regra
   * normal acende por prefixo. Sem `exata`, "Verificações" (/revisao)
   * acenderia junto com "Histórico" (/revisao/historico), e "Visão geral"
   * (/escritorio) ficaria acesa em todas as telas do escritório.
   */
  exata?: boolean;
}

/**
 * Qual item da lateral fica aceso num dado caminho.
 *
 * Mora aqui, e não no componente, porque a regra tem uma armadilha que só
 * aparece quando uma seção ganha a segunda tela: por prefixo, a raiz acende
 * junto com as filhas. Aconteceu de verdade com /revisao e /revisao/historico.
 *
 * O prefixo continua sendo o padrão porque é o certo para o caso comum:
 * "Casos" precisa ficar aceso em /advogado/casos/{id}. Quem é raiz de seção
 * se declara com `exata`.
 */
export function itemAceso(item: ItemDaLateral, caminho: string): boolean {
  if (caminho === item.href) return true;

  const porApelido = (item.tambem ?? []).some(
    (prefixo) => caminho === prefixo || caminho.startsWith(`${prefixo}/`),
  );
  if (porApelido) return true;

  return item.exata !== true && caminho.startsWith(`${item.href}/`);
}

export type FluxoDeTrabalho = "advogado" | "escritorio";

/**
 * As laterais de cada fluxo. Ficam aqui, longe do componente, para que o
 * teste possa exercitar as listas DE VERDADE: a regra de destaque só erra
 * quando encontra uma lista concreta, e uma lista inventada no teste não
 * pegaria uma raiz de seção que esqueceu o `exata`.
 */
export const lateralDoFluxo: Record<FluxoDeTrabalho, ItemDaLateral[]> = {
  advogado: [
    {
      rotulo: "Mensagens",
      href: "/advogado",
      exata: true,
      tambem: ["/advogado/conversas"],
    },
    { rotulo: "Casos", href: "/advogado/casos" },
    { rotulo: "Agenda", href: "/advogado/agenda" },
    { rotulo: "Alcance", href: "/advogado/alcance" },
    { rotulo: "Meu perfil", href: "/advogado/perfil" },
    { rotulo: "Notificações", href: "/advogado/notificacoes" },
  ],
  escritorio: [
    { rotulo: "Visão geral", href: "/escritorio", exata: true },
    {
      rotulo: "Mensagens",
      href: "/escritorio/mensagens",
      tambem: ["/escritorio/conversas"],
    },
    { rotulo: "Casos", href: "/escritorio/casos" },
    { rotulo: "Equipe", href: "/escritorio/equipe" },
    { rotulo: "Alcance", href: "/escritorio/alcance" },
    { rotulo: "Perfil", href: "/escritorio/perfil" },
    { rotulo: "Notificações", href: "/escritorio/notificacoes" },
    {
      rotulo: "Assinatura",
      href: "/escritorio/assinatura",
      tambem: ["/escritorio/planos"],
    },
  ],
};

/** A lateral da equipe da Jurii. */
export const lateralDaRevisao: ItemDaLateral[] = [
  { rotulo: "Verificações", href: "/revisao", exata: true },
  { rotulo: "Histórico", href: "/revisao/historico" },
];
