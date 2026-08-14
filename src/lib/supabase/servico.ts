import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * O cliente da SERVICE_ROLE, e o único lugar do repositório que a menciona.
 *
 * ELA NUNCA VAI PARA O NAVEGADOR. A variável não tem prefixo NEXT_PUBLIC_ de
 * propósito: com o prefixo, o Next a embutiria no pacote do cliente e ela
 * estaria no HTML de qualquer visitante. Sem o prefixo, ela só existe no
 * servidor, e só nas variáveis de ambiente da Vercel.
 *
 * QUEM USA: o webhook de pagamento, e só ele. É a rota que nenhuma pessoa
 * autentica, então ela não tem sessão para agir em nome de ninguém, e ainda
 * assim precisa mover assinatura para 'active'.
 *
 * E mesmo aqui a chave não escreve à toa: a única coisa que o webhook chama
 * é `aplicar_efeito_de_pagamento`, que é a porta com a transição validada.
 * Chave que pode tudo escrevendo direto numa tabela de cobrança é porta
 * larga, e a função existe para estreitá-la.
 */
export function clienteDeServico(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (url === undefined || chave === undefined) {
    // Falha ALTO e cedo. Um cliente meio configurado erraria só na hora do
    // pagamento, que é o pior momento possível para descobrir.
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY ausente: o webhook de pagamento não pode aplicar nada sem ela.",
    );
  }

  return createClient(url, chave, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
