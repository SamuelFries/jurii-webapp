/**
 * O alcance do profissional, espelho de summarizeReach do app
 * (professional_reach.dart): a janela dos últimos N dias, a anterior para
 * comparação, e o funil que a tela conta: viram na busca, abriram o
 * perfil, iniciaram conversa.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Linha = Record<string, any>;

export interface DiaDeAlcance {
  dia: string;
  alcance: number;
  visitas: number;
  conversas: number;
}

export function diaDeAlcanceDaLinha(row: Linha): DiaDeAlcance {
  return {
    dia: String(row.day ?? ""),
    alcance: Number(row.reach ?? 0),
    visitas: Number(row.profile_views ?? 0),
    conversas: Number(row.conversations ?? 0),
  };
}

export interface ResumoDeAlcance {
  dias: number;
  alcance: number;
  visitas: number;
  conversas: number;
  alcanceAnterior: number;
  /** % de quem viu e abriu o perfil; nulo sem base (0 de alcance). */
  taxaDeVisita: number | null;
  /** % de quem abriu e chamou; nulo sem base. */
  taxaDeConversa: number | null;
}

export function resumoDeAlcance(
  linhas: DiaDeAlcance[],
  dias: number,
): ResumoDeAlcance {
  const ordenados = [...linhas].sort((a, b) => a.dia.localeCompare(b.dia));
  const janela =
    ordenados.length >= dias ? ordenados.slice(ordenados.length - dias) : ordenados;
  const anterior =
    ordenados.length > dias ? ordenados.slice(0, ordenados.length - dias) : [];

  const soma = (lista: DiaDeAlcance[], campo: (d: DiaDeAlcance) => number) =>
    lista.reduce((total, item) => total + campo(item), 0);

  const alcance = soma(janela, (d) => d.alcance);
  const visitas = soma(janela, (d) => d.visitas);
  const conversas = soma(janela, (d) => d.conversas);

  const taxa = (de: number, para: number): number | null =>
    de === 0 ? null : Math.round((para / de) * 100);

  return {
    dias,
    alcance,
    visitas,
    conversas,
    alcanceAnterior: soma(anterior, (d) => d.alcance),
    taxaDeVisita: taxa(alcance, visitas),
    taxaDeConversa: taxa(visitas, conversas),
  };
}
