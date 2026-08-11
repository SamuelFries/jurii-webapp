"use server";

import { redirect } from "next/navigation";

import { localParaIsoUtc } from "@/lib/dominio/agenda";
import { clienteDoServidor } from "@/lib/supabase/servidor";

function volta(sufixo: string): never {
  redirect(`/advogado/agenda?${sufixo}`);
}

function leDatas(dados: FormData): { inicio: string; fim: string } | never {
  const inicio = localParaIsoUtc(String(dados.get("inicio") ?? ""));
  const fim = localParaIsoUtc(String(dados.get("fim") ?? ""));
  if (inicio === null || fim === null) {
    volta(`erro=${encodeURIComponent("Preencha início e fim do compromisso.")}`);
  }
  if (fim <= inicio) {
    volta(`erro=${encodeURIComponent("O fim precisa ser depois do início.")}`);
  }
  return { inicio, fim };
}

/** As MESMAS RPCs do app: create_appointment / update_appointment /
 * cancel_appointment. Cancelar não apaga: vira status cancelled, e some
 * das listas como no app. */
export async function criarCompromisso(dados: FormData): Promise<void> {
  const titulo = String(dados.get("titulo") ?? "").trim();
  if (titulo === "") volta(`erro=${encodeURIComponent("Dê um título.")}`);
  const { inicio, fim } = leDatas(dados);

  const supabase = await clienteDoServidor();
  const { error } = await supabase.rpc("create_appointment", {
    title_value: titulo,
    starts_at_value: inicio,
    ends_at_value: fim,
    location_value: String(dados.get("local") ?? "").trim(),
    area_value: String(dados.get("area") ?? "").trim(),
    counterpart_name_value: String(dados.get("com_quem") ?? "").trim(),
    case_id_value: null,
  });
  if (error) {
    volta(`erro=${encodeURIComponent("Não foi possível criar o compromisso.")}`);
  }
  volta("ok=criado");
}

export async function atualizarCompromisso(dados: FormData): Promise<void> {
  const titulo = String(dados.get("titulo") ?? "").trim();
  if (titulo === "") volta(`erro=${encodeURIComponent("Dê um título.")}`);
  const { inicio, fim } = leDatas(dados);

  const supabase = await clienteDoServidor();
  const { error } = await supabase.rpc("update_appointment", {
    appointment_id_value: String(dados.get("id") ?? ""),
    title_value: titulo,
    starts_at_value: inicio,
    ends_at_value: fim,
    location_value: String(dados.get("local") ?? "").trim(),
    area_value: String(dados.get("area") ?? "").trim(),
    counterpart_name_value: String(dados.get("com_quem") ?? "").trim(),
  });
  if (error) {
    volta(`erro=${encodeURIComponent("Não foi possível salvar o compromisso.")}`);
  }
  volta("ok=salvo");
}

export async function cancelarCompromisso(dados: FormData): Promise<void> {
  const supabase = await clienteDoServidor();
  const { error } = await supabase.rpc("cancel_appointment", {
    appointment_id_value: String(dados.get("id") ?? ""),
  });
  if (error) {
    volta(`erro=${encodeURIComponent("Não foi possível cancelar.")}`);
  }
  volta("ok=cancelado");
}
