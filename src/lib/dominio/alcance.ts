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
  /** Quantas das visualizações vieram de vaga patrocinada. */
  patrocinado: number;
  visitas: number;
  conversas: number;
}

export function diaDeAlcanceDaLinha(row: Linha): DiaDeAlcance {
  return {
    dia: String(row.day ?? ""),
    alcance: Number(row.reach ?? 0),
    patrocinado: Number(row.sponsored_reach ?? 0),
    visitas: Number(row.profile_views ?? 0),
    conversas: Number(row.conversations ?? 0),
  };
}

export interface ResumoDeAlcance {
  dias: number;
  alcance: number;
  patrocinado: number;
  visitas: number;
  conversas: number;
  alcanceAnterior: number;
  /** % de quem viu e abriu o perfil; nulo sem base (0 de alcance). */
  taxaDeVisita: number | null;
  /** % de quem abriu e chamou; nulo sem base. */
  taxaDeConversa: number | null;
  /**
   * Variação contra o período anterior, em FRAÇÃO (-1 a +infinito), como
   * reachChange do app. Nula sem base: crescer "infinito%" a partir de zero
   * não é informação, é ruído.
   */
  variacao: number | null;
  /** A série exibida (os últimos N dias, ordenados), para o gráfico. */
  serie: DiaDeAlcance[];
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

  const alcanceAnterior = soma(anterior, (d) => d.alcance);

  return {
    dias,
    alcance,
    patrocinado: soma(janela, (d) => d.patrocinado),
    visitas,
    conversas,
    alcanceAnterior,
    taxaDeVisita: taxa(alcance, visitas),
    taxaDeConversa: taxa(visitas, conversas),
    variacao:
      alcanceAnterior === 0 ? null : (alcance - alcanceAnterior) / alcanceAnterior,
    serie: janela,
  };
}

/** dd/MM, o rótulo das pontas do gráfico, como no app. */
export function dataCurta(diaIso: string): string {
  const [, mes, dia] = diaIso.slice(0, 10).split("-");
  return `${dia}/${mes}`;
}

/**
 * Os dois caminhos SVG do gráfico de área, espelho do _ReachChartPainter:
 * curva SUAVE (cúbica com pontos de controle no meio do intervalo, não
 * linha quebrada) e a área fechada até o chão para o degradê.
 *
 * Escala com PISO 1: uma série toda zerada dividiria por zero e, pior,
 * desenharia a linha no TOPO, dando impressão de alcance cheio.
 */
export function caminhosDoGrafico(
  serie: DiaDeAlcance[],
  largura: number,
  altura: number,
): { linha: string; area: string } | null {
  if (serie.length === 0) return null;

  const maximo = Math.max(1, ...serie.map((dia) => dia.alcance));
  const passo = serie.length === 1 ? 0 : largura / (serie.length - 1);
  const ponto = (indice: number) => {
    const x = serie.length === 1 ? largura / 2 : indice * passo;
    const y = altura - (serie[indice].alcance / maximo) * altura;
    return { x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) };
  };

  let linha = "";
  for (let i = 0; i < serie.length; i += 1) {
    const p = ponto(i);
    if (i === 0) {
      linha += `M ${p.x} ${p.y}`;
      continue;
    }
    const anterior = ponto(i - 1);
    const meio = Number(((anterior.x + p.x) / 2).toFixed(2));
    linha += ` C ${meio} ${anterior.y}, ${meio} ${p.y}, ${p.x} ${p.y}`;
  }

  const primeiro = ponto(0);
  const ultimo = ponto(serie.length - 1);
  const area = `${linha} L ${ultimo.x} ${altura} L ${primeiro.x} ${altura} Z`;

  return { linha, area };
}
