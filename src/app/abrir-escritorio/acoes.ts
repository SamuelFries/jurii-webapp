"use server";

import { consultaCep, enderecoEmUmaLinha } from "@/lib/cep";

/**
 * O endereço e a coordenada a partir do CEP, para o formulário preencher
 * sozinho. Vive no SERVIDOR porque a cascata chama três APIs externas: no
 * navegador seria CORS e o Nominatim veria o usuário (ver src/lib/cep.ts).
 */
export async function buscaEndereco(
  cep: string,
  numero: string,
): Promise<{
  endereco: string;
  latitude: number | null;
  longitude: number | null;
} | null> {
  const encontrado = await consultaCep(cep, numero);
  if (encontrado === null) return null;
  return {
    endereco: enderecoEmUmaLinha(encontrado),
    latitude: encontrado.coordenada?.latitude ?? null,
    longitude: encontrado.coordenada?.longitude ?? null,
  };
}
