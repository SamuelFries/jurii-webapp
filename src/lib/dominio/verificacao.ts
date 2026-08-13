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

// ---------------------------------------------------------------------------
// Abertura de escritório
// ---------------------------------------------------------------------------

/** O único documento que o escritório envia, o mesmo id do app. */
export const documentoDoEscritorio = {
  tipo: "profile_photo",
  titulo: "Foto de perfil do escritório",
  detalhe: "Logotipo ou fachada, o que o cliente vê na busca",
  aceita: "image/jpeg,image/png,image/webp",
} as const;

export function digitosDoCnpj(bruto: string): string {
  return bruto.replace(/\D/g, "").slice(0, 14);
}

export function mascaraDeCnpj(bruto: string): string {
  const d = digitosDoCnpj(bruto);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12)
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

/**
 * CNPJ com dígito verificador, a mesma checagem que o CPF já tinha no
 * cadastro: a Receita não é consultada aqui, mas número inventado não passa.
 */
export function cnpjValido(bruto: string): boolean {
  const d = digitosDoCnpj(bruto);
  if (d.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(d)) return false;

  const digito = (ate: number): number => {
    let peso = ate - 7;
    let soma = 0;
    for (let i = 0; i < ate; i += 1) {
      soma += Number(d[i]) * peso;
      peso -= 1;
      if (peso < 2) peso = 9;
    }
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  return digito(12) === Number(d[12]) && digito(13) === Number(d[13]);
}

/**
 * A validação do cadastro do escritório. Espelha o que o BANCO exige
 * (cep de 8 dígitos quando existe; coordenadas aos pares, garantido pelo
 * chamador) e o que o formulário do app pede.
 */
export function validaEscritorio(entrada: {
  nome: string;
  cnpj: string;
  telefone: string;
  email: string;
  cep: string;
  areas: string[];
  foto: { tamanho: number; mime: string } | null;
}): ProblemaDaVerificacao[] {
  const problemas: ProblemaDaVerificacao[] = [];

  if (entrada.nome.trim().length < 2) {
    problemas.push({ campo: "nome", mensagem: "Informe o nome do escritório." });
  }
  if (!cnpjValido(entrada.cnpj)) {
    problemas.push({ campo: "cnpj", mensagem: "CNPJ inválido." });
  }
  if (entrada.telefone.replace(/\D/g, "").length < 10) {
    problemas.push({ campo: "telefone", mensagem: "Informe um telefone com DDD." });
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(entrada.email.trim())) {
    problemas.push({ campo: "email", mensagem: "Informe um e-mail válido." });
  }
  // O banco só aceita CEP de 8 dígitos ou nulo; meio CEP é recusado lá.
  const cep = entrada.cep.replace(/\D/g, "");
  if (cep !== "" && cep.length !== 8) {
    problemas.push({ campo: "cep", mensagem: "O CEP precisa ter 8 dígitos." });
  }
  if (entrada.areas.length === 0) {
    problemas.push({
      campo: "areas",
      mensagem: "Escolha ao menos uma área atendida.",
    });
  }
  if (entrada.foto === null) {
    problemas.push({ campo: "foto", mensagem: "Envie a foto do escritório." });
  } else {
    if (entrada.foto.tamanho > TAMANHO_MAXIMO_DO_DOCUMENTO) {
      problemas.push({ campo: "foto", mensagem: "A foto passa de 10 MB." });
    }
    if (!documentoDoEscritorio.aceita.split(",").includes(entrada.foto.mime)) {
      problemas.push({
        campo: "foto",
        mensagem: "A foto precisa ser imagem (JPG, PNG ou WEBP).",
      });
    }
  }

  return problemas;
}

/**
 * A LINHA de verification_documents, num lugar só e testável.
 *
 * Existe por causa de um defeito que foi para produção: o formulário
 * inseria `size_bytes`, a coluna real é `file_size_bytes`, o PostgREST
 * recusa o INSERT inteiro quando uma coluna não existe, e o código
 * engolia o erro. Resultado: os arquivos subiam e a fila de revisão dizia
 * "chegou sem documento". O teste deste payload trava os nomes.
 */
export function linhaDeDocumento(entrada: {
  verificacaoId: string;
  usuarioId: string;
  tipo: string;
  titulo: string;
  caminho: string;
  mime: string;
  tamanho: number;
}): Record<string, unknown> {
  return {
    verification_id: entrada.verificacaoId,
    user_id: entrada.usuarioId,
    document_type: entrada.tipo,
    title: entrada.titulo,
    storage_path: entrada.caminho,
    mime_type: entrada.mime,
    file_size_bytes: entrada.tamanho,
  };
}
