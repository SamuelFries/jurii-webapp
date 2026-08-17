"use server";

import { redirect } from "next/navigation";

import { clienteDoServidor } from "@/lib/supabase/servidor";

/**
 * Aceitar o convite de equipe.
 *
 * QUEM DECIDE É O BANCO: uso único (FOR UPDATE na linha do link), expiração,
 * revogação, papel e o congelamento da assinatura moram em
 * aceitar_link_de_convite. Esta ação só traduz a recusa na língua de quem lê
 * e leva quem entrou para a casa nova.
 */
export async function aceitarConvite(dados: FormData): Promise<void> {
  const token = String(dados.get("token") ?? "");
  const supabase = await clienteDoServidor();

  const { data: lawFirmId, error } = await supabase.rpc(
    "aceitar_link_de_convite",
    { token_value: token },
  );

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
              : "Não foi possível aceitar o convite. Tente de novo.";
    redirect(
      `/convite/${encodeURIComponent(token)}?erro=${encodeURIComponent(mensagem)}`,
    );
  }

  redirect(`/escritorio/${String(lawFirmId)}`);
}
