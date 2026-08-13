/**
 * Saneamento de destino de redirecionamento.
 *
 * POR QUE UM ARQUIVO SÓ: seis arquivos de ação repetiam a mesma checagem
 * à mão, `caminho.startsWith("/") && !caminho.startsWith("//")`, e ela tem
 * furo. Medido:
 *
 *   "//evil.com"      bloqueado
 *   "/\\evil.com"     PASSAVA, e o navegador resolve http://evil.com/
 *   "/\/evil.com"     PASSAVA, e o navegador resolve http://evil.com/
 *   "/<tab>/evil.com" PASSAVA, e o navegador resolve http://evil.com/
 *
 * A causa é que o navegador normaliza barra invertida como barra, e
 * ignora tabulação e quebra de linha dentro da URL. Comparar prefixo de
 * string nunca vai cobrir isso, porque quem decide o destino é o parser de
 * URL, não a string.
 *
 * Então quem decide aqui também é o parser: resolvemos o caminho contra
 * uma origem sentinela e só aceitamos se ele CONTINUAR nessa origem.
 * Qualquer truque que escape para outro host muda a origem e é recusado.
 */
const SENTINELA = "http://interno.invalido";

export function caminhoInterno(bruto: unknown, padrao: string): string {
  const texto = typeof bruto === "string" ? bruto : "";
  if (texto === "") return padrao;

  try {
    const url = new URL(texto, SENTINELA);
    // Escapou da origem sentinela: é destino externo disfarçado.
    if (url.origin !== SENTINELA) return padrao;
    // O hash não serve para nada num redirecionamento de servidor e só
    // seria mais superfície.
    return `${url.pathname}${url.search}`;
  } catch {
    return padrao;
  }
}

/** Acrescenta um parâmetro ao destino já saneado, respeitando o que ele já tem. */
export function comParametro(
  caminho: string,
  chave: string,
  valor: string,
): string {
  const separador = caminho.includes("?") ? "&" : "?";
  return `${caminho}${separador}${chave}=${encodeURIComponent(valor)}`;
}
