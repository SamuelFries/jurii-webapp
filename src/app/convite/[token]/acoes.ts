"use server";

import { redirect } from "next/navigation";

import { clienteDoServidor } from "@/lib/supabase/servidor";

/**
 * Pedir entrada na equipe.
 *
 * O LINK NÃO CONCEDE MAIS, ele PEDE. Quem clica não vira membro: nasce uma
 * solicitação que um sócio ou admin aprova. O motivo é identidade — o link
 * autoriza um PAPEL, e circula em WhatsApp; quem decide precisa ver QUEM
 * apareceu, porque membro novo lê toda conversa com cliente da banca.
 *
 * Quem decide tudo é o banco (solicitar_entrada_por_link): consome o link,
 * confere congelamento, vínculo existente e prazo. Aqui só se traduz a
 * recusa.
 */
export async function pedirEntrada(dados: FormData): Promise<void> {
  const token = String(dados.get("token") ?? "");
  const supabase = await clienteDoServidor();

  const { error } = await supabase.rpc("solicitar_entrada_por_link", {
    token_value: token,
  });

  if (error) {
    const mensagem = error.message.includes("already used")
      ? "Este link já foi usado. Peça um novo para quem te convidou."
      : error.message.includes("expired")
        ? "Este link venceu. Peça um novo para quem te convidou."
        : error.message.includes("revoked")
          ? "Este link foi cancelado pelo escritório."
          : error.message.includes("Already a member")
            ? "Você já faz parte deste escritório."
            : error.message.includes("Subscription is not active")
              ? "A assinatura do escritório está pendente e a equipe não pode crescer agora. Avise quem te convidou."
              : "Não foi possível enviar o pedido. Tente de novo.";
    redirect(
      `/convite/${encodeURIComponent(token)}?erro=${encodeURIComponent(mensagem)}`,
    );
  }

  // Fica na própria página: ela passa a mostrar o estado de espera, porque a
  // espiada reconhece quem consumiu o link.
  redirect(`/convite/${encodeURIComponent(token)}`);
}
