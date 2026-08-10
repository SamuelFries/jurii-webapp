/**
 * Casos dos três fluxos, espelho do CaseRepository do app.
 *
 * A derivação de status do caso do advogado copia deriveLawyerCaseStatus
 * (lawyer_case.dart): o enum do banco ainda tem 'deadline', mas nenhum
 * caminho o escreve desde a 20260804120000; cai no padrão, como sempre caiu.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Linha = Record<string, any>;

export interface CasoDoCliente {
  id: string;
  titulo: string;
  area: string;
  status: string;
  atualizadoEm: string;
  cnj: string | null;
  encerrado: boolean;
}

export type StatusDoCasoDoAdvogado = "updated" | "new_message" | "closed";

export interface CasoDoAdvogado {
  id: string;
  titulo: string;
  cliente: string;
  iniciaisDoCliente: string;
  area: string;
  atualizadoEm: string;
  status: StatusDoCasoDoAdvogado;
  cnj: string | null;
}

export interface CasoDoEscritorio {
  id: string;
  titulo: string;
  cliente: string;
  iniciaisDoCliente: string;
  advogadoId: string | null;
  advogado: string;
  area: string;
  statusRotulo: string;
  proximoPasso: string;
  urgente: boolean;
  encerrado: boolean;
  cnj: string | null;
}

export interface SolicitacaoDeCaso {
  id: string;
  conversaId: string;
  titulo: string;
  area: string;
  resumo: string;
  solicitadoPor: string;
  iniciais: string;
}

export function statusDoCasoDoAdvogado(status: unknown): StatusDoCasoDoAdvogado {
  if (status === "closed") return "closed";
  if (status === "new_message") return "new_message";
  return "updated";
}

export function casoDoClienteDaLinha(row: Linha): CasoDoCliente {
  return {
    id: String(row.id),
    titulo: String(row.title ?? ""),
    area: String(row.area ?? "Atendimento jurídico"),
    status: String(row.status_label ?? row.status ?? ""),
    atualizadoEm: String(row.last_update_label ?? ""),
    cnj: row.cnj_number == null ? null : String(row.cnj_number),
    encerrado: row.status === "closed",
  };
}

export function casoDoAdvogadoDaLinha(row: Linha): CasoDoAdvogado {
  return {
    id: String(row.id),
    titulo: String(row.title ?? ""),
    cliente: String(row.client_name ?? ""),
    iniciaisDoCliente: String(row.client_initials ?? "CL"),
    area: String(row.area ?? "Atendimento jurídico"),
    atualizadoEm: String(row.last_update_label ?? ""),
    status: statusDoCasoDoAdvogado(row.status),
    cnj: row.cnj_number == null ? null : String(row.cnj_number),
  };
}

export function casoDoEscritorioDaLinha(row: Linha): CasoDoEscritorio {
  return {
    id: String(row.id),
    titulo: String(row.title ?? ""),
    cliente: String(row.client_name ?? ""),
    iniciaisDoCliente: String(row.client_initials ?? "CL"),
    advogadoId:
      row.assigned_lawyer_id == null ? null : String(row.assigned_lawyer_id),
    advogado: String(row.assigned_lawyer ?? "Sem advogado definido"),
    area: String(row.area ?? "Atendimento jurídico"),
    statusRotulo: String(row.status_label ?? ""),
    proximoPasso: String(row.next_step ?? ""),
    urgente: row.urgent === true,
    encerrado: row.status === "closed",
    cnj: row.cnj_number == null ? null : String(row.cnj_number),
  };
}

export function solicitacaoDaLinha(row: Linha): SolicitacaoDeCaso {
  return {
    id: String(row.id),
    conversaId: String(row.conversation_id ?? ""),
    titulo: String(row.title ?? ""),
    area: String(row.area ?? ""),
    resumo: String(row.summary ?? ""),
    solicitadoPor: String(row.requested_by ?? ""),
    iniciais: String(row.requester_initials ?? "?"),
  };
}
