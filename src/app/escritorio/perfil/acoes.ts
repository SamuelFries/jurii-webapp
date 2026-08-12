"use server";

import { redirect } from "next/navigation";

import {
  consultaCep,
  decideCoordenada,
  digitosDoCep,
  enderecoEmUmaLinha,
  precisaGeocodificar,
} from "@/lib/cep";
import { clienteDoServidor } from "@/lib/supabase/servidor";

function volta(sufixo: string): never {
  redirect(`/escritorio/perfil?${sufixo}`);
}

export async function salvarApresentacao(dados: FormData): Promise<void> {
  const supabase = await clienteDoServidor();
  const { error } = await supabase.rpc("update_law_firm_description", {
    law_firm_id_value: String(dados.get("escritorio") ?? ""),
    description_value: String(dados.get("descricao") ?? "").trim(),
  });
  if (error) {
    const mensagem = error.message.includes("Not allowed")
      ? "Apenas sócio e admin editam a apresentação."
      : "Não foi possível salvar a apresentação.";
    volta(`erro=${encodeURIComponent(mensagem)}`);
  }
  volta("ok=apresentacao");
}

/**
 * Grava o conjunto INTEIRO de horários numa tacada, como o app: substituir
 * tudo evita o cliente ver estado intermediário (sexta sumida por um
 * instante porque a tela ainda gravava). O payload chega como JSON num
 * campo oculto, montado pelo editor.
 */
export async function salvarHorarios(dados: FormData): Promise<void> {
  let horarios: unknown;
  try {
    horarios = JSON.parse(String(dados.get("horarios") ?? "[]"));
  } catch {
    volta(`erro=${encodeURIComponent("Horários inválidos. Recarregue e tente de novo.")}`);
  }

  const supabase = await clienteDoServidor();
  const { error } = await supabase.rpc("set_law_firm_business_hours", {
    law_firm_id_value: String(dados.get("escritorio") ?? ""),
    hours_value: horarios,
  });
  if (error) {
    const mensagem = error.message.includes("Not allowed")
      ? "Apenas sócio e admin editam os horários."
      : "O servidor recusou os horários. Confira os intervalos.";
    volta(`erro=${encodeURIComponent(mensagem)}`);
  }
  volta("ok=horarios");
}

/**
 * O CADASTRO do escritório, MESMA RPC do app (update_law_firm_profile):
 * nome, contato, endereço e áreas. Antes isto só existia no aplicativo, e
 * o escritório que mudasse de sala ou trocasse de telefone ficava com o
 * cadastro errado até alguém abrir o celular.
 *
 * A COORDENADA segue a regra do app, e ela é sutil (ver decideCoordenada):
 * endereço alimenta a ordenação por distância da descoberta, então
 * coordenada velha é pior que coordenada nenhuma. Geocodificar é
 * best-effort: falhou, o cadastro grava do mesmo jeito.
 */
export async function salvarCadastro(dados: FormData): Promise<void> {
  const texto = (campo: string) => String(dados.get(campo) ?? "").trim();
  const nome = texto("nome");
  if (nome.length < 2) {
    volta(`erro=${encodeURIComponent("Informe o nome do escritório.")}`);
  }

  const cepNovo = digitosDoCep(texto("cep"));
  const numeroNovo = texto("numero");
  const cepAntigo = texto("cep_antigo");
  const numeroAntigo = texto("numero_antigo");
  const latAntiga = texto("latitude_antiga");
  const lonAntiga = texto("longitude_antiga");
  const coordenadaAtual =
    latAntiga === "" || lonAntiga === ""
      ? null
      : { latitude: Number(latAntiga), longitude: Number(lonAntiga) };

  const buscou = precisaGeocodificar({
    cepNovo,
    cepAntigo,
    numeroNovo,
    numeroAntigo,
    coordenadaAtual,
  });
  const encontrado = buscou ? await consultaCep(cepNovo, numeroNovo) : null;
  const coordenada = decideCoordenada({
    cepNovo,
    cepAntigo,
    numeroNovo,
    numeroAntigo,
    coordenadaAtual,
    buscada: encontrado?.coordenada ?? null,
    buscou,
  });

  // O endereço por escrito: o que a pessoa digitou vence; vazio com CEP
  // válido cai para o que a consulta trouxe, como no app.
  const enderecoDigitado = texto("endereco");
  const endereco =
    enderecoDigitado !== ""
      ? enderecoDigitado
      : encontrado !== null
        ? enderecoEmUmaLinha(encontrado)
        : "";

  const areas = dados
    .getAll("areas")
    .map((area) => String(area))
    .filter((area) => area !== "");
  const areaPrincipal = texto("area_principal");

  const supabase = await clienteDoServidor();
  const { error } = await supabase.rpc("update_law_firm_profile", {
    law_firm_id_value: texto("escritorio"),
    name_value: nome,
    phone_value: texto("telefone") || null,
    email_value: texto("email") || null,
    website_url_value: texto("site") || null,
    address_value: endereco || null,
    address_number_value: numeroNovo || null,
    address_complement_value: texto("complemento") || null,
    cep_value: cepNovo || null,
    latitude_value: coordenada?.latitude ?? null,
    longitude_value: coordenada?.longitude ?? null,
    primary_area_value: areaPrincipal || null,
    practice_areas_value: areas.length > 0 ? areas : null,
    // O logotipo continua no aplicativo: subir arquivo tem regras próprias
    // (bucket, tamanho, limpeza de órfão) e prometer aqui sem cumprir seria
    // pior que não oferecer.
    avatar_action_value: "preserve",
    avatar_storage_path_value: null,
  });

  if (error) {
    const mensagem = error.message.includes("Not allowed")
      ? "Apenas sócio e admin editam o cadastro."
      : "Não foi possível salvar o cadastro. Tente de novo.";
    volta(`erro=${encodeURIComponent(mensagem)}`);
  }
  volta(coordenada === null && cepNovo !== "" ? "ok=cadastro-sem-mapa" : "ok=cadastro");
}
