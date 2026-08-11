/**
 * Validações do cadastro, espelho de lib/utils/validators.dart no app.
 * Divergir aqui é aceitar na web um cadastro que o app recusaria.
 */

export const tamanhoMinimoDeSenha = 8;

export function somenteDigitos(valor: string): string {
  return valor.replace(/[^0-9]/g, "");
}

/** Dígito verificador de verdade, o mesmo algoritmo do app: CPF com os 11
 * dígitos iguais ou com verificador errado não passa. */
export function cpfValido(valor: string): boolean {
  const cpf = somenteDigitos(valor);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const digito = (tamanho: number): number => {
    let soma = 0;
    for (let i = 0; i < tamanho; i++) {
      soma += Number(cpf[i]) * (tamanho + 1 - i);
    }
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  return digito(9) === Number(cpf[9]) && digito(10) === Number(cpf[10]);
}

/** Nome e sobrenome: uma palavra só não identifica ninguém num contrato. */
export function nomeCompleto(valor: string): boolean {
  const partes = valor.trim().split(/\s+/);
  return partes.length >= 2 && partes.every((parte) => parte.length > 0);
}

/** "000.000.000-00" enquanto digita, sem travar apagamento. */
export function mascaraDeCpf(valor: string): string {
  const digitos = somenteDigitos(valor).slice(0, 11);
  let saida = digitos;
  if (digitos.length > 9) {
    saida = `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9)}`;
  } else if (digitos.length > 6) {
    saida = `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6)}`;
  } else if (digitos.length > 3) {
    saida = `${digitos.slice(0, 3)}.${digitos.slice(3)}`;
  }
  return saida;
}

/** Telefone opcional com DDD, espelho de validateOptionalPhoneField do app:
 * vazio passa; "+55" na frente é descartado; fora disso, 10 ou 11 dígitos. */
export function telefoneValido(valor: string): boolean {
  let telefone = somenteDigitos(valor);
  if (
    (telefone.length === 12 || telefone.length === 13) &&
    telefone.startsWith("55")
  ) {
    telefone = telefone.slice(2);
  }
  if (telefone === "") return true;
  return telefone.length === 10 || telefone.length === 11;
}
