/**
 * Envio da verificação da OAB, espelho do LawyerVerificationRepository e do
 * formulário do app.
 *
 * POR QUE ISTO EXISTE NO WEBAPP: sem ele, o webapp não consegue criar um
 * profissional. Quem criava conta aqui caía na porta do cliente e só saía
 * de lá pelo celular, o que é o avesso de uma ferramenta cuja razão de ser
 * é o profissional.
 */

/** Os 27, como em brazilian_states.dart. */
export const estadosDaOab = [
  "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS",
  "MT", "PA", "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC",
  "SE", "SP", "TO",
];

/**
 * Os TRÊS documentos que a verificação exige, com os mesmos identificadores
 * do app (verification_document_catalog.dart): o `documentType` vira parte
 * do caminho no storage e a coluna `document_type` da linha.
 */
export const documentosDaVerificacao = [
  {
    tipo: "identity",
    titulo: "Documento de identificação",
    detalhe: "RG ou CNH",
    aceita: "image/jpeg,image/png,image/webp,application/pdf",
  },
  {
    tipo: "oab_card",
    titulo: "Carteira da OAB",
    detalhe: "Documento profissional oficial",
    aceita: "image/jpeg,image/png,image/webp,application/pdf",
  },
  {
    tipo: "professional_photo",
    titulo: "Foto profissional",
    // A foto profissional NÃO é documento privado: ela vira o avatar
    // público do perfil, e por isso só aceita imagem.
    detalhe: "É a imagem que aparece no seu perfil",
    aceita: "image/jpeg,image/png,image/webp",
  },
] as const;

export type TipoDeDocumento = (typeof documentosDaVerificacao)[number]["tipo"];

export const TAMANHO_MAXIMO_DO_DOCUMENTO = 10 * 1024 * 1024;

/** Só dígitos, como o app normaliza antes de mandar. */
export function numeroDaOab(bruto: string): string {
  return bruto.replace(/\D/g, "").slice(0, 12);
}

export function nomeSeguroDeArquivo(nome: string, maximo = 160): string {
  const base = nome.split(/[\\/]/).filter((parte) => parte.trim() !== "").pop();
  const limpo = (base ?? "documento").replace(/[^A-Za-z0-9._-]+/g, "_");
  return limpo.slice(0, maximo) || "documento";
}

/** `{uid}/{tipo}-{microssegundos}-{nome}`, o mesmo do app. */
export function caminhoDoDocumento(
  usuarioId: string,
  tipo: string,
  nomeDoArquivo: string,
  microssegundos: number,
): string {
  return `${usuarioId}/${tipo}-${microssegundos}-${nomeSeguroDeArquivo(nomeDoArquivo)}`;
}

export interface ProblemaDaVerificacao {
  campo: string;
  mensagem: string;
}

/**
 * A validação local espelha as guardas do servidor, e existe só para não
 * mandar o que ele já vai recusar: OAB, estado e área principal são
 * obrigatórios lá dentro ('OAB number is required' etc.).
 */
export function validaVerificacao(entrada: {
  oab: string;
  estado: string;
  areaPrincipal: string;
  areas: string[];
  documentos: { tipo: string; tamanho: number; mime: string }[];
}): ProblemaDaVerificacao[] {
  const problemas: ProblemaDaVerificacao[] = [];

  if (numeroDaOab(entrada.oab).length < 3) {
    problemas.push({ campo: "oab", mensagem: "Informe o número da OAB." });
  }
  if (!estadosDaOab.includes(entrada.estado)) {
    problemas.push({ campo: "estado", mensagem: "Escolha a seccional da OAB." });
  }
  if (entrada.areaPrincipal.trim() === "") {
    problemas.push({
      campo: "area",
      mensagem: "Escolha a área principal de atuação.",
    });
  }

  for (const exigido of documentosDaVerificacao) {
    const enviado = entrada.documentos.find((doc) => doc.tipo === exigido.tipo);
    if (enviado === undefined) {
      problemas.push({
        campo: exigido.tipo,
        mensagem: `Envie: ${exigido.titulo}.`,
      });
      continue;
    }
    if (enviado.tamanho > TAMANHO_MAXIMO_DO_DOCUMENTO) {
      problemas.push({
        campo: exigido.tipo,
        mensagem: `${exigido.titulo}: o arquivo passa de 10 MB.`,
      });
    }
    if (!exigido.aceita.split(",").includes(enviado.mime)) {
      problemas.push({
        campo: exigido.tipo,
        mensagem:
          exigido.tipo === "professional_photo"
            ? "A foto profissional precisa ser imagem (JPG, PNG ou WEBP)."
            : `${exigido.titulo}: envie imagem ou PDF.`,
      });
    }
  }

  return problemas;
}

/** O que a pessoa vê quando já mandou: o status da última submissão. */
export function rotuloDoStatusDaVerificacao(status: string): string {
  switch (status) {
    case "approved":
      return "Verificação aprovada";
    case "rejected":
      return "Verificação recusada";
    case "pending":
      return "Verificação em análise";
    default:
      return "Verificação enviada";
  }
}
