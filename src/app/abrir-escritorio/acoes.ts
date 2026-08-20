"use server";

import { consultaCep, enderecoEmUmaLinha } from "@/lib/cep";
import { contextoLogado } from "@/lib/contexto";

/**
 * O endereço e a coordenada a partir do CEP, para o formulário preencher
 * sozinho. Vive no SERVIDOR porque a cascata chama três APIs externas: no
 * navegador seria CORS e o Nominatim veria o usuário (ver src/lib/cep.ts).
 *
 * EXIGE SESSÃO, e não por causa do dado (CEP é público): server action é um
 * endpoint POST como outro qualquer, e sem esta linha qualquer pessoa na
 * internet usava o servidor da Jurii como proxy gratuito para as três APIs.
 * O Nominatim tem política de uso estrita e bane por IP: o preço do abuso
 * seria a geocodificação parar para todo mundo. A tela já é logada; a ação
 * passa a ser também.
 */
export async function buscaEndereco(
  cep: string,
  numero: string,
): Promise<{
  endereco: string;
  latitude: number | null;
  longitude: number | null;
} | null> {
  await contextoLogado();
  const encontrado = await consultaCep(cep, numero);
  if (encontrado === null) return null;
  return {
    endereco: enderecoEmUmaLinha(encontrado),
    latitude: encontrado.coordenada?.latitude ?? null,
    longitude: encontrado.coordenada?.longitude ?? null,
  };
}
