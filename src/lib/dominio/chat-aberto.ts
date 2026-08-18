import { rotuloDoPapel, type PapelNoEscritorio } from "../fluxos";

/**
 * O que a tela do chat aberto precisa saber e que a bolha sozinha não diz:
 * QUEM escreveu (nome e papel), de que LADO da conversa a pessoa está, onde
 * começa uma SEQUÊNCIA do mesmo autor, onde muda o DIA, e se a bola está
 * com o escritório.
 *
 * Tudo puro e testável. A tela só veste.
 */

/** Quem escreveu, resolvido pela página a partir de sender_id/sender_type. */
export interface AutorDaMensagem {
  id: string | null;
  nome: string;
  /** Rótulo do papel NA CONVERSA: "Cliente", "Sócia", "Advogado", "Secretária",
   *  "Estagiário", "Sistema". É o papel da pessoa na equipe/na conversa, e a
   *  tela o exibe junto do nome para ninguém confundir quem fala. */
  papel: string;
  /** Lado de fora (cliente) ou de dentro (equipe). Sistema não tem lado. */
  lado: "cliente" | "equipe" | "sistema";
}

/** Membro da equipe como a página já o carrega (equipe.ts). */
export interface MembroParaAutoria {
  profileId: string;
  nome: string;
  papeis: PapelNoEscritorio[];
}

/**
 * Resolve o autor de uma mensagem.
 *
 * `sender_type` decide o LADO (é a coluna que a RLS e o `urgent` do painel
 * já usam); o mapa da equipe decide nome e papel de quem está dentro. Cliente
 * recebe o nome da conversa (é o título da conversa no escopo do escritório).
 * Sistema é sistema. Membro que saiu da equipe ainda aparece com o nome
 * genérico "Equipe": a mensagem dele continua no histórico, e "Equipe" é
 * mais honesto que inventar um nome.
 */
export function resolveAutor(
  mensagem: { senderId: string | null; senderType: string },
  contexto: {
    meuId: string;
    nomeDoCliente: string;
    equipe: MembroParaAutoria[];
  },
): AutorDaMensagem {
  if (mensagem.senderType === "system" || mensagem.senderId === null) {
    return { id: null, nome: "Sistema", papel: "Sistema", lado: "sistema" };
  }
  if (mensagem.senderType === "client") {
    return {
      id: mensagem.senderId,
      nome: contexto.nomeDoCliente,
      papel: "Cliente",
      lado: "cliente",
    };
  }
  const membro = contexto.equipe.find(
    (m) => m.profileId === mensagem.senderId,
  );
  if (membro === undefined) {
    return {
      id: mensagem.senderId,
      nome: "Equipe",
      papel: "Equipe",
      lado: "equipe",
    };
  }
  return {
    id: mensagem.senderId,
    nome: primeiroNome(membro.nome),
    papel: rotuloDoPapelNaConversa(membro.papeis),
    lado: "equipe",
  };
}

/** "Marina Sangiogo" → "Marina". Sobrenome fica para o tooltip. */
export function primeiroNome(nomeCompleto: string): string {
  const partes = nomeCompleto.trim().split(/\s+/);
  return partes[0] ?? nomeCompleto;
}

/**
 * O papel que a conversa mostra. Sócio > admin > advogado > secretária >
 * estagiário, a mesma precedência da equipe; e "Sócia"/"Sócio" fica no
 * neutro que rotuloDoPapel já usa, para não inventar flexão de gênero que
 * o cadastro não guarda.
 */
export function rotuloDoPapelNaConversa(papeis: PapelNoEscritorio[]): string {
  const ordem: PapelNoEscritorio[] = [
    "owner",
    "admin",
    "lawyer",
    "secretary",
    "intern",
  ];
  const principal = ordem.find((p) => papeis.includes(p));
  return principal === undefined ? "Equipe" : rotuloDoPapel(principal);
}

/**
 * Onde começa uma sequência: primeira mensagem, ou autor diferente da
 * anterior, ou mais de 10 minutos depois da anterior (para uma resposta de
 * horas depois não colar na anterior como se fosse continuação).
 */
export function comecaSequencia(
  atual: { autorId: string | null; criadaEm: Date },
  anterior: { autorId: string | null; criadaEm: Date } | null,
): boolean {
  if (anterior === null) return true;
  if (anterior.autorId !== atual.autorId) return true;
  return atual.criadaEm.getTime() - anterior.criadaEm.getTime() > 10 * 60_000;
}

/**
 * Onde muda o dia (no fuso do Brasil, -03:00, o mesmo de rotuloDeHorario).
 * Devolve o rótulo do separador quando muda, ou null.
 */
export function separadorDeDia(
  atual: Date,
  anterior: Date | null,
  agora: Date,
): string | null {
  const dia = (d: Date) => {
    const local = new Date(d.getTime() - 3 * 3_600_000);
    return `${local.getUTCFullYear()}-${local.getUTCMonth()}-${local.getUTCDate()}`;
  };
  if (anterior !== null && dia(atual) === dia(anterior)) return null;

  const hojeStr = dia(agora);
  const ontemStr = dia(new Date(agora.getTime() - 86_400_000));
  const atualStr = dia(atual);
  if (atualStr === hojeStr) return "Hoje";
  if (atualStr === ontemStr) return "Ontem";
  const local = new Date(atual.getTime() - 3 * 3_600_000);
  const dd = String(local.getUTCDate()).padStart(2, "0");
  const mm = String(local.getUTCMonth() + 1).padStart(2, "0");
  const mesmoAno =
    local.getUTCFullYear() ===
    new Date(agora.getTime() - 3 * 3_600_000).getUTCFullYear();
  return mesmoAno ? `${dd}/${mm}` : `${dd}/${mm}/${local.getUTCFullYear()}`;
}

/**
 * A bola está com o escritório? Sim quando a ÚLTIMA mensagem (ignorando
 * sistema) é do cliente. É a mesma regra do `urgent` do painel de casos,
 * que só acrescenta o limiar de 24 h.
 */
export function clienteAguarda(
  mensagens: { lado: "cliente" | "equipe" | "sistema"; criadaEm: Date }[],
): { aguarda: boolean; desde: Date | null } {
  for (let i = mensagens.length - 1; i >= 0; i--) {
    const m = mensagens[i];
    if (m.lado === "sistema") continue;
    return m.lado === "cliente"
      ? { aguarda: true, desde: m.criadaEm }
      : { aguarda: false, desde: null };
  }
  return { aguarda: false, desde: null };
}
