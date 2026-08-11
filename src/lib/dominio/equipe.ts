import { urlDoAvatar } from "../avatar";
import { papeisDaLinha, type PapelNoEscritorio } from "../fluxos";

/** A equipe do escritório, espelho de _fetchTeamMembers do app: linhas de
 * law_firm_members (status != disabled) com o join de profiles. */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Linha = Record<string, any>;

export interface MembroDaEquipe {
  profileId: string;
  /** Perfil profissional, quando o membro é advogado; é o id que a
   * indicação ao cliente usa. */
  lawyerId: string | null;
  nome: string;
  iniciais: string;
  avatarUrl: string | null;
  papeis: PapelNoEscritorio[];
  ativo: boolean;
  convitePendente: boolean;
}

export function membroDaLinha(row: Linha): MembroDaEquipe {
  const perfil = (row.profiles ?? null) as Linha | null;
  const status = String(row.status ?? "active");
  return {
    profileId: String(row.profile_id ?? ""),
    lawyerId: row.lawyer_id == null ? null : String(row.lawyer_id),
    nome: String(perfil?.full_name ?? "Integrante"),
    iniciais: String(perfil?.initials ?? "?"),
    avatarUrl: urlDoAvatar(
      perfil?.avatar_url == null ? null : String(perfil.avatar_url),
    ),
    papeis: papeisDaLinha(row.roles, row.member_role ?? row.role),
    ativo: status === "active",
    convitePendente: status === "invited" || status === "pending",
  };
}
