/**
 * A CENTRAL DE AJUDA do webapp, como DADO e não como JSX.
 *
 * Mora aqui por três motivos, e nenhum deles é organização:
 *
 * 1. LINK MORTO É REPROVADO NESTA CASA, e ajuda é onde ele nasce: o texto
 *    envelhece sozinho quando a tela citada muda de rota. Com o conteúdo em
 *    lista, o teste abre `src/app` e confere que cada atalho tem página; um
 *    parágrafo com `<Link>` solto no meio da tela não é conferível.
 * 2. A ajuda só pode afirmar o que ESTE webapp faz. A central do aplicativo
 *    responde a quem CONTRATA advogado (buscar profissional, aceitar caso,
 *    triagem, selo de patrocínio), e nada disso existe no computador:
 *    copiar de lá produziria instruções que a pessoa segue e não encontra.
 * 3. Ela precisa valer para o advogado E para o escritório, e por isso
 *    NENHUM atalho carrega id de escritório. As rotas do escritório são
 *    `/escritorio/{id}/...`, e esta página não tem id: quem trabalha em
 *    duas bancas não tem "o" escritório. As telas do escritório são
 *    citadas pelo nome que está na barra lateral (Equipe, Perfil,
 *    Assinatura), que é o que a pessoa vê.
 *
 * REGRA DE ESCRITA: cada frase daqui corresponde a comportamento que existe
 * no código, quase sempre no BANCO (RPC ou policy), e não na tela. Prazo,
 * canal de atendimento e promessa de resposta ficam de fora enquanto não
 * houver quem os cumpra: uma central que erra é pior que central nenhuma.
 */

/** Atalho para a tela que resolve o assunto da pergunta. */
export interface AtalhoDeAjuda {
  rotulo: string;
  /** Sempre interno e sem id de escritório; o teste barra o resto. */
  href: string;
}

export interface PerguntaDeAjuda {
  pergunta: string;
  /** Um item por parágrafo. Lista vazia é reprovada pelo teste. */
  resposta: string[];
  atalhos?: AtalhoDeAjuda[];
}

export interface SecaoDeAjuda {
  titulo: string;
  perguntas: PerguntaDeAjuda[];
}

export const secoesDeAjuda: SecaoDeAjuda[] = [
  {
    titulo: "Começar a trabalhar aqui",
    perguntas: [
      {
        pergunta: "A mesa de trabalho não abriu. O que falta?",
        resposta: [
          "A mesa abre com um destes dois papéis: verificação da OAB aprovada, ou vínculo ativo com um escritório. Sem nenhum dos dois, a conta entra e encontra uma porta explicando isso, em vez de uma tela vazia.",
          "A conta é a mesma do aplicativo, então boa parte dos casos é entrar com a conta errada. Se você é advogado e ainda não enviou a verificação, é por ela que se começa.",
        ],
        atalhos: [{ rotulo: "Verificação da OAB", href: "/verificacao" }],
      },
      {
        pergunta: "Como envio a verificação da minha OAB?",
        resposta: [
          "Na tela de verificação, com número e seccional da OAB, a área principal e três documentos: identificação (RG ou CNH), carteira da OAB e uma foto profissional. Cada arquivo pode ter até 10 MB.",
          "Os documentos ficam guardados em área privada, vistos só por quem analisa. A foto profissional é a única exceção: ela é pública, porque vira a sua foto de perfil.",
          "Enquanto a análise estiver em curso o formulário some da tela, porque enviar de novo não adianta: o pedido já está na fila. Quando a verificação é aprovada, a mesa de trabalho abre sozinha nesta conta.",
          "Há um caso que o computador não resolve: quem já tem vínculo ativo com um escritório não chega a essa tela, que é a porta de quem ainda não tem papel nenhum. Nessa situação, a verificação da OAB se envia pelo aplicativo.",
        ],
        atalhos: [{ rotulo: "Verificação da OAB", href: "/verificacao" }],
      },
      {
        pergunta: "Quem analisa a verificação e o que acontece se for recusada?",
        resposta: [
          "Quem analisa é a equipe da Jurii, uma ficha por vez. Não existe checagem automática nem consulta à OAB no momento do envio, e por isso não há hora marcada: a análise leva alguns dias úteis.",
          "Recusa sempre vem com motivo escrito, porque o sistema não aceita recusar sem ele. O motivo aparece na sua tela de verificação, junto de uma notificação avisando a decisão.",
          "Depois da recusa o formulário volta, então dá para corrigir e enviar de novo ali mesmo. Cada envio é um pedido novo.",
        ],
        atalhos: [{ rotulo: "Verificação da OAB", href: "/verificacao" }],
      },
      {
        pergunta: "Como abro um escritório?",
        resposta: [
          "Pela tela de abrir escritório, e a ordem é plano primeiro, papelada depois. O cadastro só é aceito de quem tem licença viva, então sem plano a tela leva para os planos em vez de deixar você preencher tudo para ouvir não no fim.",
          "O formulário pede nome, CNPJ, telefone, e-mail, endereço (o CEP preenche o resto sozinho), as áreas atendidas, uma foto do escritório e quatro documentos: cartão CNPJ, contrato social, comprovante de endereço e documento do responsável.",
          "Não é preciso ser advogado verificado para abrir escritório: são coisas separadas. O que fecha a porta é já ser sócio de alguma banca, porque a licença é por pessoa. Quem é estagiário, secretária ou advogado do escritório de outra pessoa pode fundar o seu.",
          "Aprovado o pedido, o escritório nasce e quem pediu entra nele como sócio.",
        ],
        atalhos: [
          { rotulo: "Abrir escritório", href: "/abrir-escritorio" },
          { rotulo: "Ver os planos", href: "/planos" },
        ],
      },
      {
        pergunta: "Como funcionam os planos e o teste grátis?",
        resposta: [
          "Todos os planos incluem as mesmas funções. O que muda é o tamanho da equipe, isto é, quantos advogados cabem no escritório.",
          "A primeira licença começa com 30 dias de teste grátis, sem cartão. Trocar de plano depois não recomeça o teste, e a troca vale para o escritório inteiro.",
          "A escolha e a troca ficam em Planos; o estado do que você contratou fica em Assinatura. Quem já é sócio de uma banca cai direto na tela do escritório dela.",
        ],
        atalhos: [
          { rotulo: "Planos", href: "/planos" },
          { rotulo: "Assinatura", href: "/assinatura" },
        ],
      },
    ],
  },
  {
    titulo: "Escritório: equipe e cargos",
    perguntas: [
      {
        pergunta: "Quais são os cargos e o que cada um pode fazer?",
        resposta: [
          "São cinco: sócio, admin, advogado, secretária e estagiário. Uma pessoa pode acumular cargos, e o que aparece é o mais alto deles.",
          "Sócio e admin cuidam da banca: convidam advogado, mudam os cargos da equipe e editam o cadastro e o perfil do escritório. Atribuir um caso a um advogado é de sócio, admin e secretária. Só sócio dá ou tira o cargo de sócio, e o escritório precisa ficar sempre com pelo menos um.",
          "O cargo também decide o que se lê: o CNPJ do escritório, por exemplo, só volta para sócio e admin.",
          "Nada disso é regra de tela. Quem recusa é o servidor, com as mesmas regras do aplicativo; a tela apenas esconde o botão que a chamada recusaria de qualquer jeito.",
        ],
      },
      {
        pergunta: "Como convido um advogado para a equipe?",
        resposta: [
          "Na tela de Equipe, no bloco de convite, informando UF e número da OAB. O bloco aparece para sócio e admin.",
          "Só é possível convidar quem já é advogado verificado na Jurii. Quando aquela OAB não tem cadastro aprovado, nada é criado, e a tela responde a mesma coisa: dizer que a pessoa não existe transformaria o campo numa consulta de quem está na Jurii.",
          "A vaga conta no plano. Com o teto de advogados batido, o convite é recusado, e o caminho é aumentar o plano em Assinatura.",
          "Quem foi convidado responde em Notificações, nos botões de aceitar e recusar. Até responder, a pessoa aparece para você em Convites pendentes.",
        ],
      },
      {
        pergunta: "Trabalho em mais de um escritório. Como troco?",
        resposta: [
          "No rodapé da barra lateral, no bloco Atuando como, que mostra cada escritório e o seu cargo naquele. Ele aparece a partir de dois vínculos: com um só, seria um botão que não escolhe nada.",
          "O escritório aberto é o que está no endereço da página. Por isso duas abas podem ficar em bancas diferentes ao mesmo tempo, sem uma mexer na outra, e o sino conta o que chegou na banca aberta, não a soma de todas.",
          "Trocar não mexe em vínculo nenhum: apenas guarda qual foi o último aberto, para o próximo login começar por ele. E editar o endereço não abre banca alheia: um id que não seja seu devolve você para a sua casa.",
        ],
      },
    ],
  },
  {
    titulo: "O dia a dia: conversas, casos e agenda",
    perguntas: [
      {
        pergunta: "Como proponho um caso a um cliente?",
        resposta: [
          "No topo da conversa, em Propor caso: título, área e um resumo opcional. Existe nas conversas do advogado e nas do escritório, e quem propõe é o profissional responsável por aquela conversa.",
          "A solicitação chega ao cliente, que aceita ou recusa no aplicativo. Aceita, o caso passa a existir para os dois lados e aparece em Casos.",
        ],
      },
      {
        pergunta: "Como envio uma foto ou um documento na conversa?",
        resposta: [
          "Pelo botão + ao lado do campo de mensagem, que abre Enviar foto e Anexar arquivo. Imagem aparece na própria conversa e arquivo vira link para baixar.",
          "São os mesmos anexos do aplicativo. Eles ficam em área privada e são servidos por link temporário, então copiar o endereço de uma imagem não dá acesso permanente a ninguém.",
        ],
      },
      {
        pergunta: "Como acompanho o andamento do processo?",
        resposta: [
          "No detalhe do caso. Quem cuida do caso escreve ali o número CNJ, e a partir dele o andamento público do tribunal aparece na mesma tela, somente leitura.",
          "Movimentação nova também avisa o advogado, e não só o cliente: ela chega no sino, ao vivo. O aviso do sistema operacional é opcional e só é pedido depois de você clicar para autorizar.",
          "Processo em segredo de justiça não tem dados públicos. Nesse caso a lista fica vazia mesmo com o número certo, e não é erro de cadastro.",
        ],
      },
      {
        pergunta: "Como funciona a agenda e a sincronização com meu calendário?",
        resposta: [
          "A agenda fica na área do advogado, com os próximos compromissos agrupados por dia e os passados em outra aba, no horário de Brasília. São os mesmos compromissos do aplicativo. Cancelar não apaga: o compromisso passa a cancelado e sai das listas.",
          "O lembrete de cerca de uma hora antes é feito no servidor, então ele não depende de deixar a aba aberta. Ele aparece no sino como qualquer outro aviso.",
          "Em Sincronizar com meu calendário você gera um link para assinar a agenda no Google, na Apple ou no Outlook. Esse link não pede senha: quem tiver o endereço vê os seus compromissos. Por isso a defesa é revogar, e não esconder: gerar um novo link derruba o anterior na hora, e desativar apaga o link.",
          "A sincronização é de mão única, da Jurii para o seu calendário. A agenda é de cada advogado, e não do escritório.",
        ],
        atalhos: [{ rotulo: "Agenda", href: "/advogado/agenda" }],
      },
      {
        pergunta: "O que o painel de Alcance mostra?",
        resposta: [
          "O caminho de quem procurou advogado no aplicativo: quantas pessoas viram você na busca, quantas abriram o seu perfil e quantas chegaram a conversar, no período escolhido, comparado com o período anterior. Sem base de comparação, a variação não é exibida, porque crescer a partir de zero não informa nada.",
          "Quando parte das visualizações veio de vaga patrocinada, o painel diz quantas foram. Patrocínio não se contrata por aqui: o que se assina no computador é a licença do escritório.",
        ],
      },
      {
        pergunta: "Onde edito o meu perfil profissional?",
        resposta: [
          "Em Meu perfil, na área do advogado: apresentação e áreas de atuação, que é o que aparece para quem procura advogado no aplicativo.",
          "O perfil do escritório fica em Perfil, dentro da banca, e ali sócio e admin editam apresentação, cadastro e horário de atendimento.",
        ],
      },
    ],
  },
  {
    titulo: "Sua conta",
    perguntas: [
      {
        pergunta: "Como mudo nome, telefone ou foto?",
        resposta: [
          "Na tela da sua conta. É a mesma conta do aplicativo: o que mudar aqui muda lá.",
          "O e-mail aparece no formulário, mas não muda por aqui, porque é o endereço da conta. O CPF não aparece: ele é informado uma vez, na criação da conta.",
        ],
        atalhos: [{ rotulo: "Sua conta", href: "/conta" }],
      },
      {
        pergunta: "Como troco a senha?",
        resposta: [
          "Pelo e-mail. Na sua conta, o botão de redefinir leva para a tela que envia o link, e a senha nova é escrita depois de abrir esse link.",
          "No computador não existe troca digitando a senha atual, e isso é decisão: passar pelo e-mail é o que impede que alguém troque a sua senha numa aba que você deixou aberta.",
          "A tela responde a mesma coisa com e-mail cadastrado ou não. Também de propósito: confirmar quais e-mails existem entregaria a lista de clientes de um escritório a quem quisesse testar endereços.",
        ],
        atalhos: [
          { rotulo: "Redefinir senha", href: "/recuperar" },
          { rotulo: "Sua conta", href: "/conta" },
        ],
      },
      {
        pergunta: "Como excluo minha conta?",
        resposta: [
          "Na sua conta, na seção de excluir. O botão só libera depois de você digitar a palavra excluir. É a mesma exclusão do aplicativo, e não tem volta.",
          "O que acontece: os vínculos com escritórios são desativados, os documentos e a verificação da OAB são apagados, os pedidos de escritório ainda em análise são recusados, os arquivos que você enviou são removidos e o perfil é anonimizado.",
          "O escritório não é apagado junto. Havendo alguém ativo na equipe, a titularidade passa para essa pessoa. Sem ninguém ativo além de você, o escritório fica sem sócio.",
        ],
        atalhos: [{ rotulo: "Sua conta", href: "/conta" }],
      },
    ],
  },
  {
    titulo: "Quando algo dá errado",
    perguntas: [
      {
        pergunta: "Alguém está incomodando numa conversa. O que eu faço?",
        resposta: [
          "No canto do cabeçalho da conversa há um menu com Bloquear conversa. Bloquear impede novas mensagens dos dois lados até você desbloquear, e a trava é do servidor: não há outro caminho por onde a mensagem entre.",
          "No mesmo menu dá para denunciar, escolhendo o motivo e escrevendo o que aconteceu. A denúncia fica registrada com o seu relato, mas ela não devolve resposta nem desfaz nada sozinha. Quem corta o contato na hora é o bloqueio.",
        ],
      },
      {
        pergunta: "Não achei minha resposta aqui.",
        resposta: [
          "Não existe canal de atendimento no computador: nenhuma tela oferece telefone, chat ou endereço para escrever. Preferimos dizer isso a publicar um contato que ninguém lê do outro lado.",
          "O que se resolve sem depender de ninguém, e onde: senha esquecida (redefinir por e-mail), verificação recusada (o motivo está na tela e o reenvio é ali mesmo), tamanho da equipe e cobrança (Planos e Assinatura), conversa com problema (bloquear no cabeçalho dela) e sair da Jurii (excluir a conta).",
          "Os Termos de Uso e a Política de Privacidade ficam no rodapé de qualquer página daqui.",
        ],
        atalhos: [
          { rotulo: "Redefinir senha", href: "/recuperar" },
          { rotulo: "Verificação da OAB", href: "/verificacao" },
          { rotulo: "Planos", href: "/planos" },
          { rotulo: "Sua conta", href: "/conta" },
        ],
      },
    ],
  },
];

/** Todos os atalhos, sem repetição de referência, para o teste percorrer. */
export function atalhosDaAjuda(
  secoes: SecaoDeAjuda[] = secoesDeAjuda,
): AtalhoDeAjuda[] {
  return secoes.flatMap((secao) =>
    secao.perguntas.flatMap((item) => item.atalhos ?? []),
  );
}

/** Todo o texto exibido, para as barreiras de redação do teste. */
export function textoDaAjuda(
  secoes: SecaoDeAjuda[] = secoesDeAjuda,
): string[] {
  return secoes.flatMap((secao) => [
    secao.titulo,
    ...secao.perguntas.flatMap((item) => [
      item.pergunta,
      ...item.resposta,
      ...(item.atalhos ?? []).map((atalho) => atalho.rotulo),
    ]),
  ]);
}
