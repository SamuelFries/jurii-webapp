/**
 * O que a visão geral do escritório tem para dizer.
 *
 * A tela nasceu mostrando quatro números e duas seções que só apareciam se
 * houvesse caso. Escritório recém-aprovado, que é justamente quem mais
 * precisa de direção, via quatro zeros e meia tela vazia.
 *
 * O que preenche esse espaço não é enfeite: é o que FALTA para o escritório
 * funcionar. Cada passo aqui é lido do banco, aponta para a tela que o
 * resolve, e some quando está resolvido.
 */

export interface EstadoDoEscritorio {
  apresentacao: string;
  areas: string[];
  cep: string;
  telefone: string;
  email: string;
  diasComHorario: number;
  pessoasNaEquipe: number;
}

export interface PassoDoEscritorio {
  chave: string;
  titulo: string;
  porque: string;
  href: string;
}

/** Qual TELA resolve o passo. Vira rota só quando se sabe qual escritório. */
type TelaQueResolve = "perfil" | "equipe";

interface PassoPendente {
  chave: string;
  titulo: string;
  porque: string;
  tela: TelaQueResolve;
}

/**
 * O que ainda falta, na ordem em que atrapalha.
 *
 * A ordem não é arbitrária: primeiro o que impede o cliente de ACHAR o
 * escritório (áreas e CEP alimentam busca e distância), depois o que o faz
 * ESCOLHER (apresentação, horário, contato), e por último a equipe, que é a
 * única coisa que ele não vê.
 *
 * Guarda a TELA, e não a rota pronta: o domínio não conhece
 * `/escritorio/{id}/...`, e quem junta as duas coisas é `passosDoEscritorio`.
 */
function pendenciasDoEscritorio(estado: EstadoDoEscritorio): PassoPendente[] {
  const passos: PassoPendente[] = [];

  if (estado.areas.length === 0) {
    passos.push({
      chave: "areas",
      titulo: "Escolha as áreas que o escritório atende",
      porque:
        "É por elas que o cliente encontra a banca. Sem nenhuma marcada, o escritório não aparece em busca nenhuma.",
      tela: "perfil",
    });
  }

  if (estado.cep.replace(/\D/g, "").length !== 8) {
    passos.push({
      chave: "cep",
      titulo: "Complete o endereço com o CEP",
      porque:
        "O CEP alimenta a ordenação por distância: sem ele, o escritório não aparece para quem está perto.",
      tela: "perfil",
    });
  }

  if (estado.apresentacao.trim().length < 40) {
    passos.push({
      chave: "apresentacao",
      titulo: "Escreva a apresentação do escritório",
      porque:
        "É o texto que o cliente lê antes de decidir falar com vocês. Perfil sem apresentação perde para o que tem.",
      tela: "perfil",
    });
  }

  if (estado.diasComHorario === 0) {
    passos.push({
      chave: "horarios",
      titulo: "Informe o horário de atendimento",
      porque:
        "Sem horário publicado, o cliente não sabe quando esperar resposta e costuma procurar outro.",
      tela: "perfil",
    });
  }

  if (estado.telefone.trim() === "" && estado.email.trim() === "") {
    passos.push({
      chave: "contato",
      titulo: "Deixe um telefone ou e-mail de contato",
      porque:
        "É por onde o cliente fala com o escritório fora do aplicativo.",
      tela: "perfil",
    });
  }

  if (estado.pessoasNaEquipe <= 1) {
    passos.push({
      chave: "equipe",
      titulo: "Convide os advogados da banca",
      porque:
        "Escritório de uma pessoa só não divide carteira: é a equipe que faz caso ter responsável e conversa ter quem responda.",
      tela: "equipe",
    });
  }

  return passos;
}

/**
 * Os passos que faltam, já apontando para a tela DESTE escritório.
 *
 * O id entra aqui, e não na página, porque a rota do fluxo carrega o
 * escritório (`/escritorio/{id}/perfil`): montar o href fora daqui obrigava
 * quem chama a remendar o caminho com um replace, e um remendo desses só
 * some quando alguém repara nele.
 */
export function passosDoEscritorio(
  estado: EstadoDoEscritorio,
  escritorioId: string,
): PassoDoEscritorio[] {
  return pendenciasDoEscritorio(estado).map((passo) => ({
    chave: passo.chave,
    titulo: passo.titulo,
    porque: passo.porque,
    href: `/escritorio/${escritorioId}/${passo.tela}`,
  }));
}

/**
 * Quanto do cadastro já está de pé, de 0 a 1.
 *
 * Serve para a tela dizer "faltam 2 de 6" em vez de só listar pendências: a
 * pessoa precisa saber se está no começo ou quase lá. Não precisa do id: a
 * CONTA das pendências não depende de para onde elas apontam.
 */
export function progressoDoEscritorio(estado: EstadoDoEscritorio): {
  feitos: number;
  total: number;
} {
  const total = 6;
  return { total, feitos: total - pendenciasDoEscritorio(estado).length };
}
