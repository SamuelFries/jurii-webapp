# jurii-webapp

A FERRAMENTA DE TRABALHO de advogados e escritórios: o dia inteiro
(mensagens, casos, carteira, equipe, agenda, assinatura) numa tela grande,
falando com o MESMO banco pelas MESMAS RPCs e RLS do aplicativo.

**Não tem fluxo de cliente, e isso é decisão, não pendência.** Quem
contrata advogado resolve a vida no aplicativo, que é onde a pessoa está
quando o problema jurídico aparece; quem PAGA a Jurii é o profissional, e
é ele que deixa a aba aberta o dia inteiro. Manter uma segunda
implementação das telas de cliente custaria sincronia com o Flutter para
sempre em troca de um caso de uso raro. Cliente que entrar aqui encontra
`/cliente`, uma porta que explica onde é a área dele, em vez de uma mesa
vazia.

O pagamento também vai viver aqui, e não no app, por decisão: compra dentro
do app entrega 30% para a Apple.

Convive com dois vizinhos e não os substitui:

- **jurii** (Flutter): o produto completo. Verificações, convites, edição de
  perfil, triagem por IA e notificações continuam lá.
- **jurii-site**: marketing e páginas legais, estático puro.

## Os fluxos

A troca de fluxo segue a regra do app: o fluxo do advogado aparece para
verificação APROVADA (lawyer_verifications), o do escritório para vínculo
ATIVO (law_firm_members). Opção que a pessoa não tem não aparece. Sem
nenhum dos dois papéis, `destinoInicial` manda para `/cliente`.

**Advogado**
- `/advogado`: mensagens. `/advogado/casos`: casos com status.

**Escritório**
- `/escritorio`: mensagens com segmento Clientes | Equipe.
- `/escritorio/casos`: a carteira, com urgência e responsável.
- `/escritorio/equipe`: quem trabalha no escritório e convites pendentes.
- `/escritorio/assinatura` e `/escritorio/planos`: plano, ciclo, troca pela
  RPC `choose_law_firm_plan`. Acessíveis também SEM vínculo ativo, porque o
  contratante escolhe o plano antes de o escritório existir (a paywall do
  app exige).

**Chat**: histórico das 100 mais recentes (o teto do app), envio por insert
em `messages` sob RLS, `sender_type` conforme o fluxo, tempo real por
assinatura de INSERT, e `mark_conversation_read` ao abrir e ao receber.
Anexos aparecem de verdade: imagem inline e arquivo como link, com URL
assinada em lote (1h); mensagem de solicitação de caso vira cartão rotulado.
Cabeçalho com o nome de quem está do outro lado.

**Detalhe de caso** (os três fluxos, mesma tela, permissões do servidor):
linha do tempo de atualizações, registrar atualização e editar o CNJ
(`can_manage`), encerrar e reabrir (`can_manage_lifecycle`), andamento do
tribunal (`fetch_case_movements`) e, no escritório, atribuir advogado
(sócio, admin e secretária, a régua da própria RPC).

**Cartão público** (`/profissionais/[id]`, `/escritorios/[id]`): a vitrine
do profissional, não uma tela de cliente. É a página que o escritório manda
para um prospecto e onde a equipe confere como aparece para quem procura no
aplicativo. Sem ações de cliente: contratar acontece no app.

### Abrir a vitrine ao público (decisão pendente)

Hoje as duas exigem login. Abri-las destrava o link para prospecto e o
Google, e é o único ativo de SEO que a Jurii teria. É deliberadamente um
passo separado porque é IRREVERSÍVEL na prática: uma vez indexada, a página
fica em cache de terceiros mesmo se voltar atrás. O que muda:

1. `src/middleware.ts`: somar `/profissionais` e `/escritorios` às rotas
   públicas;
2. as duas páginas: trocar `contextoLogado()` por um cliente anônimo e
   servir uma casca própria (a de trabalho pressupõe sessão);
3. o `X-Robots-Tag: noindex` do `next.config.ts`: liberar só essas rotas.

Antes de virar a chave, decidir também se `fetch_recommended_lawyers` passa
a ter portão de aprovação: hoje a lista da descoberta não filtra aprovação
(ver a migration 20260827120000 no repo do app).

**Visão geral do escritório**: os números da operação
(`fetch_law_firm_operation_metrics`) e os casos que precisam de atenção
(sem responsável, aguardando resposta).

**Recuperação de senha**: `/recuperar` envia o link e `/redefinir` troca a
senha. A resposta é a mesma com e-mail cadastrado ou não, de propósito:
confirmar que um e-mail existe entrega a lista de clientes de um escritório
de advocacia para quem quiser enumerar. IMPORTANTE: a URL
`https://app.jurii.com.br/redefinir` precisa estar em Authentication > URL
Configuration > Redirect URLs no painel do Supabase, senão o link do e-mail
não volta para cá. Em desenvolvimento, `http://localhost:3000/redefinir`
também precisa estar lá.

## O que NÃO existe, de propósito

- **Pagamento.** A escolha do provedor (Stripe, Asaas, Pagar.me, Iugu) está
  adiada desde 10/08/2026. A interface está em
  `src/lib/pagamentos/provedor.ts`; enquanto `provedorConfigurado()` devolve
  `null`, tela nenhuma oferece pagar e `/api/webhooks/pagamento` responde
  501. Botão de pagar que não paga é link morto, e link morto é reprovado
  neste projeto.
- **Expiração do teste grátis.** Entra JUNTO com o checkout, nunca antes:
  vencer o teste sem existir como pagar tranca a pessoa do lado de fora.
- **Cadastro de conta e verificações.** Nascem no aplicativo (upload de
  documentos, OAB, CNPJ). A conta é a mesma cá e lá.
- **Anexos no chat, favoritos, notificações, triagem por IA, patrocínio.**
  Ficam no app até merecerem porta na web; nenhum item de menu promete o que
  não entrega.

## Rodar

```bash
cp .env.example .env.local   # e preencha a publishable key
npm install
npm run dev                  # http://localhost:3000
npm test                     # vitest
npm run build
```

## Segurança, as regras da casa

- A `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` é pública por desenho (é a mesma
  do binário do app). A segurança é a RLS: o webapp autentica a PESSOA e o
  banco recorta o que ela vê.
- A `service_role` NUNCA entra neste repositório nem em variável
  `NEXT_PUBLIC_`. Quando o webhook for real, ela entra SÓ nas variáveis de
  ambiente da Vercel, lida SÓ pelo código do webhook.
- Escolha e troca de plano passam pela RPC; `active`/`past_due`/`canceled`
  serão movidos exclusivamente pelo webhook.

## Deploy

**Domínio: `app.jurii.com.br`.** Subdomínio, e não caminho dentro de
`jurii.com.br`, por três motivos medidos:

1. a CSP do site é `default-src 'self'`; sem `connect-src` próprio o
   navegador **bloqueia** as chamadas daqui ao Supabase. Os dois no mesmo
   host exigiriam afrouxar a CSP da landing ou manter duas por rota;
2. o cookie de sessão do Supabase é host-only: aqui ele não viaja nas
   requisições da landing, nem para script de terceiro que entre lá depois;
3. raio de explosão: deploy daqui não derruba a página de aquisição.

O HSTS de `jurii.com.br` já usa `includeSubDomains`, então este subdomínio
**precisa** servir HTTPS desde o primeiro dia (a Vercel faz sozinha).

Vercel, projeto apontando para este repositório, domínio
`app.jurii.com.br`. Variáveis de ambiente: as duas `NEXT_PUBLIC_` do
`.env.example`. Nada mais até o provedor de pagamento existir.

Do outro lado, `jurii-site` já tem o botão **Entrar** apontando para cá.

### Se um dia os perfis públicos precisarem de Google

`/escritorios/[id]` e `/profissionais/[id]` são as únicas páginas com
interesse de indexação (perfil de escritório ranqueando é canal de
aquisição). Hoje elas exigem login e o site inteiro responde
`X-Robots-Tag: noindex`. Levá-las para `jurii.com.br` é um recorte
cirúrgico de duas rotas, e exige torná-las públicas: decisão de produto,
não de infraestrutura.
