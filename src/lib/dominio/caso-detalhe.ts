/**
 * O detalhe de um caso, espelho de fetch_case_for_current_user,
 * fetch_case_updates e fetch_case_movements no app.
 *
 * As permissões vêm do SERVIDOR, linha a linha: can_manage libera registrar
 * atualização e editar o CNJ; can_manage_lifecycle libera encerrar e
 * reabrir. A tela nunca decide papel sozinha, só obedece.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Linha = Record<string, any>;

export interface DetalheDoCaso {
  id: string;
  titulo: string;
  area: string;
  status: string;
  statusRotulo: string;
  cliente: string;
  descricao: string;
  vendoComoCliente: boolean;
  podeGerenciar: boolean;
  podeEncerrar: boolean;
  cnj: string | null;
  advogadoId: string | null;
  criadoEm: Date | null;
  encerrado: boolean;
}

export interface AtualizacaoDoCaso {
  id: string;
  titulo: string;
  corpo: string;
  autor: string;
  iniciaisDoAutor: string;
  criadaEm: Date | null;
}

/** Andamento vindo do tribunal (DataJud), só leitura. */
export interface MovimentacaoDoProcesso {
  id: string;
  titulo: string;
  corpo: string;
  ocorridaEm: Date | null;
}

export function detalheDoCasoDaLinha(row: Linha): DetalheDoCaso {
  const descricao = String(row.description ?? "").trim();
  return {
    id: String(row.id),
    titulo: String(row.title ?? "Caso jurídico"),
    area: String(row.area ?? "Atendimento jurídico"),
    status: String(row.status ?? "open"),
    statusRotulo: String(row.status_label ?? "Em andamento"),
    cliente: String(row.client_name ?? "Cliente"),
    descricao,
    vendoComoCliente: row.viewer_is_client === true,
    podeGerenciar: row.can_manage === true,
    podeEncerrar: row.can_manage_lifecycle === true,
    cnj: row.cnj_number == null ? null : String(row.cnj_number),
    advogadoId:
      row.assigned_lawyer_id == null ? null : String(row.assigned_lawyer_id),
    criadoEm: dataOuNulo(row.created_at),
    encerrado: row.status === "closed",
  };
}

export function atualizacaoDaLinha(row: Linha): AtualizacaoDoCaso {
  return {
    id: String(row.id),
    titulo: String(row.title ?? "Atualização"),
    corpo: String(row.body ?? ""),
    autor: String(row.author_name ?? "Jurii"),
    iniciaisDoAutor: String(row.author_initials ?? "JR"),
    criadaEm: dataOuNulo(row.created_at),
  };
}

export function movimentacaoDaLinha(row: Linha): MovimentacaoDoProcesso {
  return {
    id: String(row.id),
    titulo: String(row.title ?? "Movimentação"),
    corpo: String(row.body ?? ""),
    ocorridaEm: dataOuNulo(row.occurred_at),
  };
}

/** "0801234-56.2026.8.26.0100" a partir dos 20 dígitos crus do banco. */
export function formataCnj(cnj: string): string {
  const digitos = cnj.replace(/[^0-9]/g, "");
  if (digitos.length !== 20) return cnj;
  return `${digitos.slice(0, 7)}-${digitos.slice(7, 9)}.${digitos.slice(9, 13)}.${digitos.slice(13, 14)}.${digitos.slice(14, 16)}.${digitos.slice(16)}`;
}

function dataOuNulo(valor: unknown): Date | null {
  if (valor == null) return null;
  const data = new Date(String(valor));
  return Number.isNaN(data.getTime()) ? null : data;
}
