import type { NomeDoIcone } from "@/components/icone";

export interface ItemDaLateral {
  rotulo: string;
  href: string;
  /** O ícone do item, resolvido pelo componente. É dado de domínio porque a
   *  lista é: o mesmo item tem o mesmo desenho em qualquer lateral. */
  icone?: NomeDoIcone;
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
 * A lateral do advogado. Fica aqui, longe do componente, para que o teste
 * possa exercitar a lista DE VERDADE: a regra de destaque só erra quando
 * encontra uma lista concreta, e uma lista inventada no teste não pegaria
 * uma raiz de seção que esqueceu o `exata`.
 */
export const lateralDoAdvogado: ItemDaLateral[] = [
  {
    rotulo: "Mensagens",
    href: "/advogado",
    icone: "mensagens",
    exata: true,
    tambem: ["/advogado/conversas"],
  },
  { rotulo: "Casos", href: "/advogado/casos", icone: "casos" },
  { rotulo: "Agenda", href: "/advogado/agenda", icone: "agenda" },
  { rotulo: "Alcance", href: "/advogado/alcance", icone: "alcance" },
  { rotulo: "Meu perfil", href: "/advogado/perfil", icone: "perfil" },
  {
    rotulo: "Notificações",
    href: "/advogado/notificacoes",
    icone: "notificacoes",
  },
];

/**
 * A lateral do escritório é uma FUNÇÃO do escritório aberto, porque a rota
 * carrega o id: `/escritorio/{id}/casos`. Sem isso, dois vínculos teriam a
 * mesma URL e nada na barra de endereço diria qual banca está na tela.
 */
export function lateralDoEscritorio(escritorioId: string): ItemDaLateral[] {
  const raiz = `/escritorio/${escritorioId}`;
  return [
    { rotulo: "Visão geral", href: raiz, icone: "visao", exata: true },
    {
      rotulo: "Mensagens",
      href: `${raiz}/mensagens`,
      icone: "mensagens",
      tambem: [`${raiz}/conversas`],
    },
    { rotulo: "Casos", href: `${raiz}/casos`, icone: "casos" },
    { rotulo: "Equipe", href: `${raiz}/equipe`, icone: "equipe" },
    { rotulo: "Alcance", href: `${raiz}/alcance`, icone: "alcance" },
    { rotulo: "Perfil", href: `${raiz}/perfil`, icone: "perfil" },
    {
      rotulo: "Notificações",
      href: `${raiz}/notificacoes`,
      icone: "notificacoes",
    },
    {
      rotulo: "Assinatura",
      href: `${raiz}/assinatura`,
      icone: "assinatura",
      tambem: [`${raiz}/planos`],
    },
  ];
}

/**
 * As duas laterais, para o teste do destaque percorrer as listas reais. O
 * escritório entra com um id fixo de exemplo: a regra de destaque não depende
 * do valor, e sem uma lista concreta o teste não pega raiz de seção sem
 * `exata`.
 */
export const lateralDoFluxo: Record<FluxoDeTrabalho, ItemDaLateral[]> = {
  advogado: lateralDoAdvogado,
  escritorio: lateralDoEscritorio("11111111-1111-4111-8111-111111111111"),
};

/** A lateral da equipe da Jurii. */
export const lateralDaRevisao: ItemDaLateral[] = [
  { rotulo: "Verificações", href: "/revisao", icone: "verificacoes", exata: true },
  { rotulo: "Histórico", href: "/revisao/historico", icone: "historico" },
  { rotulo: "Denúncias", href: "/revisao/denuncias", icone: "denuncias" },
];
