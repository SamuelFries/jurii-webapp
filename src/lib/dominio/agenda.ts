/**
 * A agenda do advogado, espelho do AppointmentRepository do app: linhas de
 * `appointments` com role 'lawyer', canceladas fora, próximas em ordem
 * crescente e passadas em decrescente (o plano de janela do app).
 *
 * Horários em São Paulo (UTC-3 estável desde 2019, a mesma premissa do
 * resto do webapp).
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Linha = Record<string, any>;

export type StatusDoCompromisso =
  | "confirmed"
  | "pending"
  | "done"
  | "cancelled";

export interface Compromisso {
  id: string;
  titulo: string;
  comQuem: string;
  area: string;
  local: string;
  status: StatusDoCompromisso;
  comecaEm: Date | null;
  terminaEm: Date | null;
  casoId: string | null;
}

export function compromissoDaLinha(row: Linha): Compromisso {
  return {
    id: String(row.id),
    titulo: String(row.title ?? "Compromisso"),
    comQuem: String(row.counterpart_name ?? ""),
    area: String(row.area ?? ""),
    local: String(row.location ?? ""),
    status: statusDoValor(row.status),
    comecaEm: dataOuNulo(row.starts_at),
    terminaEm: dataOuNulo(row.ends_at),
    casoId: row.case_id == null ? null : String(row.case_id),
  };
}

function dataOuNulo(valor: unknown): Date | null {
  if (valor == null) return null;
  const data = new Date(String(valor));
  return Number.isNaN(data.getTime()) ? null : data;
}

function statusDoValor(valor: unknown): StatusDoCompromisso {
  switch (valor) {
    case "confirmed":
      return "confirmed";
    case "done":
      return "done";
    case "cancelled":
      return "cancelled";
    default:
      return "pending";
  }
}

export const rotuloDoStatusDoCompromisso: Record<StatusDoCompromisso, string> =
  {
    confirmed: "Confirmado",
    pending: "A confirmar",
    done: "Concluído",
    cancelled: "Cancelado",
  };

const fusoMs = 3 * 3_600_000;

/** "Hoje", "Amanhã" ou "quinta, 14/08", em São Paulo. */
export function rotuloDoDia(data: Date, agora: Date): string {
  const local = new Date(data.getTime() - fusoMs);
  const hoje = new Date(agora.getTime() - fusoMs);

  const chave = (d: Date) =>
    `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
  if (chave(local) === chave(hoje)) return "Hoje";
  const amanha = new Date(hoje.getTime() + 86_400_000);
  if (chave(local) === chave(amanha)) return "Amanhã";

  const dias = [
    "domingo",
    "segunda",
    "terça",
    "quarta",
    "quinta",
    "sexta",
    "sábado",
  ];
  const dia = String(local.getUTCDate()).padStart(2, "0");
  const mes = String(local.getUTCMonth() + 1).padStart(2, "0");
  return `${dias[local.getUTCDay()]}, ${dia}/${mes}`;
}

/** "09:00 às 10:30", em São Paulo. */
export function rotuloDoHorarioDoCompromisso(compromisso: Compromisso): string {
  const hora = (data: Date) => {
    const local = new Date(data.getTime() - fusoMs);
    return `${String(local.getUTCHours()).padStart(2, "0")}:${String(
      local.getUTCMinutes(),
    ).padStart(2, "0")}`;
  };
  if (compromisso.comecaEm === null) return "";
  if (compromisso.terminaEm === null) return hora(compromisso.comecaEm);
  return `${hora(compromisso.comecaEm)} às ${hora(compromisso.terminaEm)}`;
}

/** Agrupa por dia preservando a ordem em que os itens chegaram. */
export function agrupaPorDiaDeAgenda(
  compromissos: Compromisso[],
  agora: Date,
): { dia: string; itens: Compromisso[] }[] {
  const grupos: { dia: string; itens: Compromisso[] }[] = [];
  for (const compromisso of compromissos) {
    if (compromisso.comecaEm === null) continue;
    const dia = rotuloDoDia(compromisso.comecaEm, agora);
    const ultimo = grupos[grupos.length - 1];
    if (ultimo !== undefined && ultimo.dia === dia) {
      ultimo.itens.push(compromisso);
    } else {
      grupos.push({ dia, itens: [compromisso] });
    }
  }
  return grupos;
}

/** "2026-08-14T09:00" (datetime-local, hora de São Paulo) para ISO UTC. */
export function localParaIsoUtc(valor: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(valor)) return null;
  const data = new Date(`${valor}:00.000-03:00`);
  return Number.isNaN(data.getTime()) ? null : data.toISOString();
}

/** ISO UTC para o valor do input datetime-local, em São Paulo. */
export function isoUtcParaLocal(data: Date | null): string {
  if (data === null) return "";
  const local = new Date(data.getTime() - fusoMs);
  return local.toISOString().slice(0, 16);
}
