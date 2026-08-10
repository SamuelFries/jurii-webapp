# jurii-webapp

O Jurii no computador, com FOCO NO PROFISSIONAL: o dia de trabalho de
advogados e escritórios (mensagens, casos, carteira, equipe, assinatura)
numa tela grande, falando com o MESMO banco pelas MESMAS RPCs e RLS do
aplicativo. O fluxo do cliente também existe e é completo, mas a casa é do
profissional: quem tem escritório entra no escritório, quem é advogado
entra no advogado, e a troca de área fica no topo.

O pagamento também vai viver aqui, e não no app, por decisão: compra dentro
do app entrega 30% para a Apple.

Convive com dois vizinhos e não os substitui:

- **jurii** (Flutter): o produto completo. Verificações, convites, edição de
  perfil, triagem por IA e notificações continuam lá.
- **jurii-site**: marketing e páginas legais, estático puro.

## Os fluxos

A troca de fluxo segue a regra do app: o fluxo do advogado aparece para
verificação APROVADA (lawyer_verifications), o do escritório para vínculo
ATIVO (law_firm_members). Opção que a pessoa não tem não aparece.

**Cliente** (todo mundo logado)
- `/inicio`: busca com expansão de intenção no servidor ("meu chefe não me
  paga" acha trabalhista), advogados e escritórios recomendados, e o botão
  Conversar, que abre ou reaproveita a conversa pela RPC.
- `/conversas` e `/conversas/[id]`: lista e chat.
- `/casos`: solicitações pendentes com aceitar/recusar, e os casos.

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

Vercel, projeto apontando para este repositório. Variáveis de ambiente: as
duas `NEXT_PUBLIC_` do `.env.example`. Nada mais até o provedor existir.
