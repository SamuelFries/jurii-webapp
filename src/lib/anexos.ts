/**
 * As regras de anexo do chat, espelho do app e do servidor
 * (send_chat_attachment): imagem jpeg/png/webp até 5 MB, documento
 * pdf/doc/docx até 10 MB. A validação de verdade é a RPC; esta cópia
 * existe para recusar ANTES do upload, com mensagem na língua da pessoa,
 * em vez de subir 10 MB para ouvir não.
 */

export const mimesDeImagem = ["image/jpeg", "image/png", "image/webp"];
export const mimesDeDocumento = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const cincoMb = 5 * 1024 * 1024;
const dezMb = 10 * 1024 * 1024;

export interface AnexoAceito {
  kind: "image" | "document";
}

export function validaAnexo(
  mime: string,
  tamanhoBytes: number,
): AnexoAceito | { erro: string } {
  if (tamanhoBytes <= 0) return { erro: "O arquivo está vazio." };

  if (mimesDeImagem.includes(mime)) {
    if (tamanhoBytes > cincoMb) {
      return { erro: "A imagem passa de 5 MB. Reduza e tente de novo." };
    }
    return { kind: "image" };
  }
  if (mimesDeDocumento.includes(mime)) {
    if (tamanhoBytes > dezMb) {
      return { erro: "O documento passa de 10 MB. Reduza e tente de novo." };
    }
    return { kind: "document" };
  }
  return {
    erro: "Tipo de arquivo não aceito. Envie JPG, PNG, WebP, PDF ou Word.",
  };
}

/** O mesmo saneamento de nome do app: nada de barra, espaço ou acento no
 * caminho do storage. */
export function nomeSeguro(nome: string): string {
  const ultimo = nome
    .split(/[\\/]/)
    .filter((parte) => parte.trim() !== "")
    .pop();
  const limpo = (ultimo ?? "arquivo")
    .replace(/[^A-Za-z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .trim();
  return limpo === "" ? "arquivo" : limpo;
}

/** userId/conversaId/timestamp-nome, o formato que a RPC exige (a pasta do
 * próprio usuário; o servidor recusa caminho fora dela). */
export function caminhoDoAnexo(
  userId: string,
  conversaId: string,
  nomeDoArquivo: string,
  agoraMicros: number,
): string {
  return `${userId}/${conversaId}/${agoraMicros}-${nomeSeguro(nomeDoArquivo)}`;
}
