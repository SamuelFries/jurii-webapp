import { provedorConfigurado } from "@/lib/pagamentos/provedor";

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

  const efeito = await provedor.processarWebhook(requisicao);
  // A aplicação do efeito (service_role) entra junto com o provedor:
  // escrever esse código antes de conhecer o formato real da chamada
  // seria inventar contrato.
  return Response.json({ recebido: efeito.tipo }, { status: 200 });
}
