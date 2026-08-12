/**
 * Geocodificação de CEP, espelho do CepService do app (cep_service.dart).
 *
 * POR QUE CASCATA, e não uma fonte só: a BrasilAPI v2 devolve o ENDEREÇO
 * mas o campo de coordenada dela vem vazio. Medido no app em 06/08/2026:
 * 10 de 10 CEPs voltaram `{"type":"Point","coordinates":{}}`, e é por isso
 * que 39 dos 40 escritórios em produção têm CEP e não têm coordenada. A
 * coordenada vem das outras duas fontes:
 *
 *   1. BrasilAPI v2  endereço (e coordenada, nas raras vezes em que vem)
 *   2. AwesomeAPI    coordenada por CEP; acertou 10 de 12 no teste do app
 *   3. Nominatim/OSM coordenada por ENDEREÇO estruturado; pega os casos em
 *      que a AwesomeAPI não tem o CEP
 *
 * As duas últimas se completam: no teste do app a união cobriu 12 de 12.
 *
 * Roda no SERVIDOR (server action), não no navegador: sem CORS e sem expor
 * o usuário ao Nominatim.
 */

const TEMPO_LIMITE = 6000;
const AGENTE = "JuriiWebapp/1.0 (https://jurii.com.br)";

export interface Coordenada {
  latitude: number;
  longitude: number;
}

export interface EnderecoDeCep {
  cep: string;
  rua: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  coordenada: Coordenada | null;
}

export function digitosDoCep(bruto: string): string {
  return bruto.replace(/\D/g, "").slice(0, 8);
}

export function cepValido(bruto: string): boolean {
  return digitosDoCep(bruto).length === 8;
}

/** Endereço numa linha, do jeito que vai para o cadastro. */
export function enderecoEmUmaLinha(endereco: EnderecoDeCep): string {
  const partes = [endereco.rua, endereco.bairro, endereco.cidade].filter(
    (parte): parte is string => parte !== null && parte.trim() !== "",
  );
  if (partes.length === 0) return "";
  return endereco.uf !== null && endereco.uf !== ""
    ? `${partes.join(", ")} - ${endereco.uf}`
    : partes.join(", ");
}

/** Número que serve para geocodificar: só conta se tiver dígito ("s/n" não). */
export function temNumero(valor: string | null | undefined): boolean {
  return valor != null && /\d/.test(valor);
}

function coordenadaDe(lat: unknown, lon: unknown): Coordenada | null {
  const latitude = typeof lat === "number" ? lat : Number(String(lat ?? ""));
  const longitude = typeof lon === "number" ? lon : Number(String(lon ?? ""));
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude === 0 && longitude === 0) return null;
  return { latitude, longitude };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;

export function leBrasilApi(corpo: string): EnderecoDeCep | null {
  try {
    const json: Json = JSON.parse(corpo);
    if (json?.cep == null) return null;
    const bruta = json.location?.coordinates;
    const texto = (valor: unknown): string | null =>
      valor == null || String(valor).trim() === "" ? null : String(valor);
    return {
      cep: String(json.cep),
      rua: texto(json.street),
      bairro: texto(json.neighborhood),
      cidade: texto(json.city),
      uf: texto(json.state),
      coordenada: coordenadaDe(bruta?.latitude, bruta?.longitude),
    };
  } catch {
    return null;
  }
}

/** AwesomeAPI: `lat` e `lng`, como strings. */
export function leAwesomeApi(corpo: string): Coordenada | null {
  try {
    const json: Json = JSON.parse(corpo);
    return coordenadaDe(json?.lat, json?.lng);
  } catch {
    return null;
  }
}

/** Nominatim: lista, e `lat`/`lon` (não `lng`) no primeiro item. */
export function leNominatim(corpo: string): Coordenada | null {
  try {
    const json: Json = JSON.parse(corpo);
    if (!Array.isArray(json) || json.length === 0) return null;
    return coordenadaDe(json[0]?.lat, json[0]?.lon);
  } catch {
    return null;
  }
}

/** A consulta do Nominatim: número ANTES do logradouro, ou ele ignora. */
export function consultaDoNominatim(
  digitos: string,
  endereco: EnderecoDeCep | null,
  numero?: string | null,
): string {
  const parametros = new URLSearchParams({
    format: "json",
    limit: "1",
    country: "Brazil",
  });
  if (endereco?.rua != null && endereco.cidade != null) {
    parametros.set(
      "street",
      temNumero(numero)
        ? `${String(numero).trim()} ${endereco.rua}`
        : endereco.rua,
    );
    parametros.set("city", endereco.cidade);
    if (endereco.uf != null) parametros.set("state", endereco.uf);
  } else {
    parametros.set("postalcode", digitos);
  }
  return parametros.toString();
}

async function busca(url: string): Promise<string | null> {
  try {
    const resposta = await fetch(url, {
      headers: { "User-Agent": AGENTE, Accept: "application/json" },
      signal: AbortSignal.timeout(TEMPO_LIMITE),
      cache: "no-store",
    });
    if (!resposta.ok) return null;
    return await resposta.text();
  } catch {
    return null;
  }
}

const semEndereco = (cep: string, coordenada: Coordenada | null) => ({
  cep,
  rua: null,
  bairro: null,
  cidade: null,
  uf: null,
  coordenada,
});

/**
 * O endereço do CEP e, quando possível, a coordenada. Best-effort em tudo:
 * fonte que falha não derruba a consulta, e coordenada ausente só significa
 * que o escritório fica fora da ordenação por distância.
 */
export async function consultaCep(
  bruto: string,
  numero?: string | null,
): Promise<EnderecoDeCep | null> {
  const digitos = digitosDoCep(bruto);
  if (digitos.length !== 8) return null;

  const corpo = await busca(`https://brasilapi.com.br/api/cep/v2/${digitos}`);
  const endereco = corpo === null ? null : leBrasilApi(corpo);
  if (endereco?.coordenada != null) return endereco;

  const awesome = await busca(`https://cep.awesomeapi.com.br/json/${digitos}`);
  const porCep = awesome === null ? null : leAwesomeApi(awesome);
  if (porCep !== null) {
    return endereco === null
      ? semEndereco(digitos, porCep)
      : { ...endereco, coordenada: porCep };
  }

  const osm = await busca(
    `https://nominatim.openstreetmap.org/search?${consultaDoNominatim(digitos, endereco, numero)}`,
  );
  const porEndereco = osm === null ? null : leNominatim(osm);
  if (endereco === null) {
    return porEndereco === null ? null : semEndereco(digitos, porEndereco);
  }
  return { ...endereco, coordenada: porEndereco };
}

/**
 * A REGRA DA COORDENADA ao salvar, espelho de edit_firm_profile_screen.dart.
 * Ela é sutil e cada ramo existe por um defeito visto em produção:
 *
 *  - sem CEP, a coordenada morre: coordenada órfã de endereço que não
 *    existe mais colocaria o escritório na distância errada da descoberta;
 *  - geocodifica quando o CEP MUDOU, quando o NÚMERO mudou (~305m medidos)
 *    ou quando simplesmente NÃO HÁ coordenada. Esta última cobre os 39 de
 *    40 escritórios que têm CEP e não têm coordenada: sem ela, nem salvando
 *    de novo eles voltariam para a ordenação;
 *  - se a busca falhar e o CEP tiver mudado, a coordenada morre: manter a
 *    antiga plotaria o escritório no endereço de onde ele SAIU, pior que
 *    não ter distância;
 *  - se a busca falhar e o CEP for o mesmo, fica como estava. É
 *    best-effort, e a próxima gravação tenta de novo.
 */
export function decideCoordenada(entrada: {
  cepNovo: string;
  cepAntigo: string | null;
  numeroNovo: string;
  numeroAntigo: string | null;
  coordenadaAtual: Coordenada | null;
  buscada: Coordenada | null;
  buscou: boolean;
}): Coordenada | null {
  const digitos = digitosDoCep(entrada.cepNovo);
  if (digitos === "") return null;

  if (!entrada.buscou) return entrada.coordenadaAtual;
  if (entrada.buscada !== null) return entrada.buscada;

  const cepMudou = digitos !== digitosDoCep(entrada.cepAntigo ?? "");
  return cepMudou ? null : entrada.coordenadaAtual;
}

/** Vale gastar uma chamada de geocodificação? */
export function precisaGeocodificar(entrada: {
  cepNovo: string;
  cepAntigo: string | null;
  numeroNovo: string;
  numeroAntigo: string | null;
  coordenadaAtual: Coordenada | null;
}): boolean {
  const digitos = digitosDoCep(entrada.cepNovo);
  if (digitos.length !== 8) return false;
  const cepMudou = digitos !== digitosDoCep(entrada.cepAntigo ?? "");
  const numeroMudou =
    entrada.numeroNovo.trim() !== (entrada.numeroAntigo ?? "").trim();
  return cepMudou || numeroMudou || entrada.coordenadaAtual === null;
}
