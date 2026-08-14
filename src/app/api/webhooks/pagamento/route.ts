import { clienteDeServico } from "@/lib/supabase/servico";
import {
  ChamadaNaoAutenticada,
  provedorConfigurado,
} from "@/lib/pagamentos/provedor";

/**
 * O webhook do provedor de pagamento. Único caminho que um dia moverá
 * assinaturas para 'active' (com a service_role, que existe SÓ nas
 * variáveis de ambiente da Vercel, nunca no navegador nem no repositório).
 *
 * Enquanto o provedor não foi escolhido, responde 501 sem fingir nada:
 * a rota existe para a URL ser estável (dá para cadastrá-la no provedor
 * no dia da escolha sem novo deploy de contrato).
 */
export async function POST(requisicao: Request): Promise<Response> {
  const provedor = provedorConfigurado();
  if (provedor === null) {
    return Response.json(
      { erro: "Provedor de pagamento ainda não configurado." },
      { status: 501 },
    );
  }

  // Quem VALIDA a chamada é o provedor, e ele lança quando o token da
  // requisição não confere.
  //
  // OS DOIS ERROS PEDEM RESPOSTAS OPOSTAS, e tratá-los igual custava dinheiro
  // de verdade. Chamada forjada merece 401 e nenhuma reentrega. Mas
  // processarWebhook também CONSULTA a API do Asaas antes de decidir, e essa
  // consulta pode falhar por rede, timeout ou provedor fora do ar. Enquanto
  // este catch devolvia 401 para tudo, um timeout virava "recusado" para o
  // Asaas, que não tenta de novo: dinheiro recebido e nunca aplicado, sem
  // ninguém para perceber.
  let efeito;
  try {
    efeito = await provedor.processarWebhook(requisicao);
  } catch (erro) {
    if (erro instanceof ChamadaNaoAutenticada) {
      // Sem devolver o motivo: dizer "token inválido" para quem tentou forjar
      // é ensinar.
      return Response.json({ erro: "Chamada recusada." }, { status: 401 });
    }
    console.error(
      "webhook de pagamento falhou antes de decidir",
      erro instanceof Error ? erro.message : erro,
    );
    return Response.json({ erro: "Falha ao processar." }, { status: 500 });
  }

  if (efeito.tipo === "ignorar") {
    // 200 DE PROPÓSITO. Evento que não nos interessa não é erro, e responder
    // qualquer outra coisa faz o provedor reentregar para sempre.
    return Response.json({ recebido: "ignorado" }, { status: 200 });
  }

  // A ÚNICA PORTA. A service_role só alcança esta função, que valida a
  // transição e é idempotente, em vez de escrever direto numa tabela de
  // cobrança com uma chave que passa por cima de toda a RLS.
  const admin = clienteDeServico();
  const { data, error } = await admin.rpc("aplicar_efeito_de_pagamento", {
    assinatura_id_value: efeito.assinaturaId,
    efeito_value: efeito.tipo,
  });

  if (error) {
    // 500 para o provedor REENTREGAR: falha nossa não pode virar pagamento
    // perdido. A função é idempotente justamente para aguentar isso.
    console.error("webhook de pagamento falhou ao aplicar", error.message);
    return Response.json({ erro: "Falha ao aplicar." }, { status: 500 });
  }

  return Response.json({ recebido: efeito.tipo, resultado: data }, { status: 200 });
}
