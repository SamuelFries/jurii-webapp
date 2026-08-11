/**
 * Casamento de texto das buscas de lista, espelho de
 * lib/utils/list_search.dart no app. As regras são as MESMAS de propósito:
 * divergir aqui seria a web achar o que o app não acha.
 */

/** Minúsculo, sem acento, sem pontuação: "José" casa com "jose". */
export function normalizaTexto(valor: string): string {
  return valor
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function somenteDigitos(valor: string): string {
  return valor.replace(/[^0-9]/g, "");
}

/**
 * Cada palavra do termo tem que aparecer em ALGUM campo: "ana trabalhista"
 * acha a conversa da Ana sobre matéria trabalhista com o nome num campo e a
 * área no outro. Campo nulo é ignorado, não tratado como vazio que casa.
 */
export function buscaCasa(
  termo: string,
  campos: (string | null | undefined)[],
): boolean {
  const palavras = normalizaTexto(termo)
    .split(" ")
    .filter((palavra) => palavra !== "");
  if (palavras.length === 0) return true;

  const palheiro = campos
    .filter((campo): campo is string => typeof campo === "string")
    .map(normalizaTexto)
    .filter((campo) => campo !== "")
    .join(" ");
  if (palheiro === "") return false;

  return palavras.every((palavra) => palheiro.includes(palavra));
}

/**
 * Número de processo compara por DÍGITOS: o banco guarda 20 dígitos sem
 * máscara e o tribunal entrega "0801234-56.2026.8.26.0100". Termo sem
 * dígito nenhum não consulta o CNJ, senão buscar por nome casaria com
 * qualquer processo.
 */
export function cnjCasa(termo: string, cnj: string | null): boolean {
  if (cnj === null) return false;
  const digitos = somenteDigitos(termo);
  if (digitos === "") return false;
  return somenteDigitos(cnj).includes(digitos);
}

/**
 * Um chip de filtro só merece espaço quando SEPARA: chip que casa com tudo
 * não filtra nada, e chip que não casa com nada só esvazia a tela.
 */
export function chipUtil(casa: number, total: number): boolean {
  return casa > 0 && casa < total;
}
