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

/**
 * A foto do escritório: logotipo ou fachada. NÃO é documento de análise, é
 * o que o cliente vê na busca, e por isso vai para o balde público
 * `law-firm-avatars` e não para `verification-documents`.
 */
export const documentoDoEscritorio = {
  tipo: "profile_photo",
  titulo: "Foto de perfil do escritório",
  detalhe: "Logotipo ou fachada, o que o cliente vê na busca",
  aceita: "image/jpeg,image/png,image/webp",
} as const;

/**
 * Os QUATRO documentos que a abertura de escritório exige, com os mesmos
 * identificadores do enum `law_firm_document_type` e do catálogo do app
 * (mock_law_firm_verification.dart).
 *
 * ISTO FALTAVA. O formulário do webapp mandava só a foto, nenhuma linha ia
 * para `law_firm_verification_documents`, e todo escritório aberto pela web
 * chegava no painel da equipe com zero documento. A tela de revisão então
 * dizia, com estas palavras, "esta submissão chegou sem documento, recuse
 * pedindo o reenvio": o formulário só sabia produzir recusa.
 */
export const documentosDoEscritorio = [
  {
    tipo: "cnpj_registration",
    titulo: "Cartão CNPJ",
    detalhe: "Comprovante de inscrição da pessoa jurídica",
    aceita: "image/jpeg,image/png,image/webp,application/pdf",
  },
  {
    tipo: "articles_of_association",
    titulo: "Contrato social",
    detalhe: "Documento de constituição ou alteração vigente",
    aceita: "image/jpeg,image/png,image/webp,application/pdf",
  },
  {
    tipo: "address_proof",
    titulo: "Comprovante de endereço",
    detalhe: "Documento recente do endereço do escritório",
    aceita: "image/jpeg,image/png,image/webp,application/pdf",
  },
  {
    tipo: "owner_identity",
    titulo: "Documento do responsável",
    detalhe: "RG, CNH ou documento oficial do titular",
    aceita: "image/jpeg,image/png,image/webp,application/pdf",
  },
] as const;

export type TipoDeDocumentoDoEscritorio =
  (typeof documentosDoEscritorio)[number]["tipo"];

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
  documentos: { tipo: string; tamanho: number; mime: string }[];
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

  // Os quatro são OBRIGATÓRIOS, como no app: verificação sem documento não
  // tem como ser analisada, e deixar passar só empurra a recusa para dias
  // depois, quando a pessoa já acha que está esperando análise.
  for (const exigido of documentosDoEscritorio) {
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
        mensagem: `${exigido.titulo}: envie imagem ou PDF.`,
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

/**
 * A LINHA de law_firm_verification_documents, que NÃO é a mesma acima.
 *
 * As duas tabelas guardam a mesma ideia com colunas diferentes, e é aí que
 * mora a armadilha: aqui a coluna do dono é `owner_profile_id` (e não
 * `user_id`) e NÃO EXISTE coluna de tamanho. Mandar `user_id` ou
 * `file_size_bytes` faz o PostgREST recusar o INSERT inteiro, exatamente
 * como aconteceu com `size_bytes` no lado do advogado. O teste desta função
 * trava os nomes contra a tabela real.
 */
export function linhaDeDocumentoDeEscritorio(entrada: {
  verificacaoId: string;
  donoId: string;
  tipo: string;
  titulo: string;
  caminho: string;
  mime: string;
}): Record<string, unknown> {
  return {
    verification_id: entrada.verificacaoId,
    owner_profile_id: entrada.donoId,
    document_type: entrada.tipo,
    title: entrada.titulo,
    storage_path: entrada.caminho,
    mime_type: entrada.mime,
  };
}
