"use server";

import { redirect } from "next/navigation";

import { clienteDoServidor } from "@/lib/supabase/servidor";
import { areasDoDireito } from "@/lib/dominio/areas";

function volta(sufixo: string): never {
  redirect(`/advogado/perfil?${sufixo}`);
}

/** Bio pela MESMA RPC do app (update_lawyer_bio); o servidor limita a 800. */
export async function salvarBio(dados: FormData): Promise<void> {
  const bio = String(dados.get("bio") ?? "").trim();
  if (bio.length > 800) {
    volta(`erro=${encodeURIComponent("A apresentação passa de 800 caracteres.")}`);
  }
  const supabase = await clienteDoServidor();
  const { error } = await supabase.rpc("update_lawyer_bio", {
    bio_value: bio,
  });
  if (error) {
    volta(`erro=${encodeURIComponent("Não foi possível salvar a apresentação.")}`);
  }
  volta("ok=bio");
}

/**
 * Áreas pela MESMA RPC do app (update_lawyer_practice_areas): o servidor
 * canonicaliza apelidos e valida contra a allowlist. A principal precisa
 * estar entre as marcadas: área principal fora da lista é vitrine mentindo.
 */
export async function salvarAreas(dados: FormData): Promise<void> {
  const principal = String(dados.get("principal") ?? "").trim();
  const marcadas = dados
    .getAll("areas")
    .map(String)
    .filter((area) => (areasDoDireito as readonly string[]).includes(area));

  if (marcadas.length === 0) {
    volta(`erro=${encodeURIComponent("Marque pelo menos uma área.")}`);
  }
  if (!marcadas.includes(principal)) {
    volta(`erro=${encodeURIComponent("A área principal precisa estar entre as marcadas.")}`);
  }

  const supabase = await clienteDoServidor();
  const { error } = await supabase.rpc("update_lawyer_practice_areas", {
    primary_area_value: principal,
    practice_areas_value: marcadas,
  });
  if (error) {
    volta(`erro=${encodeURIComponent("Não foi possível salvar as áreas.")}`);
  }
  volta("ok=areas");
}
