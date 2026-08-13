/**
 * A fila de revisão, do ponto de vista de quem trabalha nela.
 *
 * Quem revisa não "navega" o painel: processa uma pilha. Então o que
 * importa é saber, sem abrir nada, o que está esperando há mais tempo e o
 * que chegou incompleto.
 */

export interface DocumentoParaRevisar {
  tipo: string;
  titulo: string;
  caminho: string;
  bucket: string;
}

/** As duas URLs de um documento: a que a tela mostra e a do clique. */
export interface UrlsDoDocumento {
  miniatura: string;
  original: string;
}

export interface FichaParaRevisar {
  id: string;
  tipo: "lawyer" | "law_firm";
  titulo: string;
  detalhe: string;
  pessoa: string;
  email: string | null;
  enviadaEmIso: string | null;
  documentos: DocumentoParaRevisar[];
}

export const rotuloDoDocumento: Record<string, string> = {
  identity: "Identificação (RG ou CNH)",
  oab_card: "Carteira da OAB",
  professional_photo: "Foto profissional",
  profile_photo: "Foto do escritório",
  cnpj_registration: "Cartão CNPJ",
  articles_of_association: "Contrato social",
  address_proof: "Comprovante de endereço",
  owner_identity: "Documento do responsável",
};

/** Os documentos que cada tipo de verificação precisa ter para ser lida. */
export const documentosExigidos: Record<"lawyer" | "law_firm", string[]> = {
  lawyer: ["identity", "oab_card", "professional_photo"],
  // O escritório NÃO exige `profile_photo` aqui, embora o formulário peça a
  // foto: ela vai para o balde público `law-firm-avatars` e vira
  // `avatar_storage_path`, nunca uma linha de documento.
  law_firm: [
    "cnpj_registration",
    "articles_of_association",
    "address_proof",
    "owner_identity",
  ],
};

/**
 * Há quanto tempo espera. É o dado mais importante da linha fechada:
 * alguém parado há uma semana é problema, e sem isto a fila parece toda
 * igual.
 */
export function esperaDesde(enviadaEmIso: string | null, agora: Date): string {
  if (enviadaEmIso === null) return "sem data";
  const enviada = new Date(enviadaEmIso);
  if (!Number.isFinite(enviada.getTime())) return "sem data";

  const minutos = Math.floor((agora.getTime() - enviada.getTime()) / 60000);
  if (minutos < 1) return "agora";
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return horas === 1 ? "há 1 hora" : `há ${horas} horas`;
  const dias = Math.floor(horas / 24);
  return dias === 1 ? "há 1 dia" : `há ${dias} dias`;
}

/** Quantos dias esperando, para a fila avisar o que está envelhecendo. */
export function diasDeEspera(
  enviadaEmIso: string | null,
  agora: Date,
): number | null {
  if (enviadaEmIso === null) return null;
  const enviada = new Date(enviadaEmIso);
  if (!Number.isFinite(enviada.getTime())) return null;
  return Math.floor((agora.getTime() - enviada.getTime()) / 86400000);
}

/**
 * A ficha está pronta para decidir? Faltando algo, a recusa pedindo reenvio
 * é o caminho, e a linha fechada já avisa isso.
 *
 * O lado do escritório estava errado nos DOIS sentidos: exigia
 * `profile_photo`, que nunca chega como documento, então TODA ficha de
 * escritório dizia "falta 1 documento", inclusive as perfeitas vindas do
 * app; e não cobrava nenhum dos quatro documentos que a análise precisa
 * ler, então uma ficha sem contrato social passava por completa.
 */
export function documentosQueFaltam(ficha: FichaParaRevisar): string[] {
  const enviados = new Set(ficha.documentos.map((doc) => doc.tipo));
  return documentosExigidos[ficha.tipo].filter((tipo) => !enviados.has(tipo));
}

// ---------------------------------------------------------------------------
// Histórico
// ---------------------------------------------------------------------------

export interface FichaDecidida extends FichaParaRevisar {
  decisao: "approved" | "rejected";
  decididaEmIso: string | null;
  revisor: string | null;
  motivo: string | null;
}

export function rotuloDaDecisao(decisao: "approved" | "rejected"): string {
  return decisao === "approved" ? "Aprovada" : "Recusada";
}

/**
 * Quem decidiu, em uma frase. Decisão anterior ao painel não tem revisor
 * gravado, e o honesto é dizer isso, e não deixar em branco como se
 * ninguém tivesse decidido.
 */
export function quemDecidiu(revisor: string | null): string {
  return revisor ?? "antes do painel existir";
}

/** dd/MM/aaaa às HH:MM, no fuso de quem lê. */
export function dataDaDecisao(iso: string | null): string {
  if (iso === null) return "sem data";
  const data = new Date(iso);
  if (!Number.isFinite(data.getTime())) return "sem data";
  return data.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
