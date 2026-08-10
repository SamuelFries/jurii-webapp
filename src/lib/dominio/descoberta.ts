/**
 * Parsers da descoberta (advogados e escritórios recomendados), espelhos de
 * LawyerProfileRepository e LawFirmRepository.firmFromRow no app. As chaves
 * lidas aqui são as mesmas que o pgTAP do app
 * (discovery_returns_contract_test.sql) força as RPCs a devolver.
 */

import { urlDoAvatar } from "../avatar";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Linha = Record<string, any>;

export interface AdvogadoRecomendado {
  id: string;
  nome: string;
  iniciais: string;
  avatarUrl: string | null;
  areaPrincipal: string;
  areas: string[];
  bio: string;
  nota: number;
  avaliacoes: number;
  patrocinado: boolean;
}

export interface EscritorioRecomendado {
  id: string;
  nome: string;
  iniciais: string;
  avatarUrl: string | null;
  especialidade: string;
  areas: string[];
  descricao: string;
  nota: number;
  avaliacoes: number;
  endereco: string | null;
}

export function advogadoDaLinha(row: Linha): AdvogadoRecomendado {
  return {
    id: String(row.id),
    nome: String(row.full_name ?? ""),
    iniciais: String(row.initials ?? "AJ"),
    avatarUrl: urlDoAvatar(row.avatar_url == null ? null : String(row.avatar_url)),
    areaPrincipal: String(row.primary_area ?? "Atendimento jurídico"),
    areas: listaDeTexto(row.practice_areas),
    bio: String(row.bio ?? ""),
    nota: Number(row.rating ?? 0),
    avaliacoes: Number(row.reviews_count ?? 0),
    patrocinado: row.is_sponsored_slot === true,
  };
}

export function escritorioDaLinha(row: Linha): EscritorioRecomendado {
  // Número e complemento nasceram em colunas próprias (20260819120000);
  // o endereço exibível é a composição, com os legados ainda dentro de
  // `address`.
  const endereco = [row.address, row.address_number, row.address_complement]
    .filter((parte) => parte != null && String(parte).trim() !== "")
    .join(", ");

  return {
    id: String(row.id),
    nome: String(row.name ?? ""),
    iniciais: String(row.initials ?? "JE"),
    avatarUrl: urlDoAvatar(row.avatar_url == null ? null : String(row.avatar_url)),
    especialidade: String(row.specialty ?? "Atendimento jurídico"),
    areas: listaDeTexto(row.practice_areas),
    descricao: String(row.description ?? ""),
    nota: Number(row.rating ?? 0),
    avaliacoes: Number(row.reviews_count ?? 0),
    endereco: endereco === "" ? null : endereco,
  };
}

function listaDeTexto(valor: unknown): string[] {
  if (!Array.isArray(valor)) return [];
  return valor.map(String).filter((texto) => texto.trim() !== "");
}
