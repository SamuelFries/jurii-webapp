/**
 * Horário de atendimento do escritório, espelho de BusinessHours no app:
 * uma linha por intervalo, weekday 1..7 na convenção do Dart (1 = segunda),
 * horários "HH:MM". São Paulo é UTC-3 estável.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Linha = Record<string, any>;

export interface IntervaloDeAtendimento {
  weekday: number;
  abre: string;
  fecha: string;
}

const nomesDosDias = [
  "",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
  "Domingo",
];

export function intervaloDaLinha(row: Linha): IntervaloDeAtendimento {
  return {
    weekday: Number(row.weekday ?? 0),
    abre: String(row.opens_at ?? "00:00").slice(0, 5),
    fecha: String(row.closes_at ?? "00:00").slice(0, 5),
  };
}

/** "Segunda: 09:00 às 12:00, 14:00 às 18:00" por dia, só dias com horário. */
export function agrupaPorDia(
  intervalos: IntervaloDeAtendimento[],
): { dia: string; horarios: string }[] {
  const porDia = new Map<number, string[]>();
  for (const intervalo of intervalos) {
    if (intervalo.weekday < 1 || intervalo.weekday > 7) continue;
    const lista = porDia.get(intervalo.weekday) ?? [];
    lista.push(`${intervalo.abre} às ${intervalo.fecha}`);
    porDia.set(intervalo.weekday, lista);
  }
  return [...porDia.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([dia, horarios]) => ({
      dia: nomesDosDias[dia],
      horarios: horarios.join(", "),
    }));
}
