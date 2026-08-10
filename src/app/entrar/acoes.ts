"use server";

import { redirect } from "next/navigation";

import { clienteDoServidor } from "@/lib/supabase/servidor";

export async function sair(): Promise<void> {
  const supabase = await clienteDoServidor();
  await supabase.auth.signOut();
  redirect("/entrar");
}
