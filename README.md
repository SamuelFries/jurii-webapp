# jurii-webapp

A área do escritório fora do aplicativo: gestão da assinatura e, quando o
provedor for escolhido, o pagamento. O pagamento vive AQUI e não no app por
decisão, não por acaso: compra dentro do app entrega 30% para a Apple.

Convive com dois vizinhos e não os substitui:

- **jurii** (Flutter): o produto. A paywall, a escolha de plano e toda a
  operação continuam lá; este webapp fala com o MESMO banco pelas MESMAS
  RPCs (`choose_law_firm_plan`) e RLS.
- **jurii-site**: marketing e páginas legais, estático puro.

## O que existe hoje

- `/entrar`: login com a conta do aplicativo (Supabase Auth, sessão em
  cookies).
- `/assinatura`: o estado da assinatura de quem entrou, com os mesmos
  rótulos do app.
- `/planos`: os planos do banco, chave Mensal/Anual com desconto calculado
  dos preços (nunca escrito à mão), troca de plano pela RPC.
- `/api/webhooks/pagamento`: responde 501 até existir provedor. A rota já
  existe para a URL ser estável no dia do cadastro no provedor.

## O que NÃO existe, de propósito

- **Pagamento.** A escolha do provedor (Stripe, Asaas, Pagar.me, Iugu) foi
  adiada em 10/08/2026. A interface está pronta em
  `src/lib/pagamentos/provedor.ts`; enquanto `provedorConfigurado()` devolve
  `null`, nenhuma tela oferece pagamento. Botão de pagar que não paga é
  link morto, e link morto é reprovado neste projeto.
- **Expiração do teste grátis.** Hoje nada expira (o portão
  `has_law_firm_license` só olha o status). A expiração entra JUNTO com o
  checkout, nunca antes: vencer o teste sem existir como pagar tranca a
  pessoa do lado de fora.
- **Cadastro de conta.** Conta nasce no aplicativo, junto com o escritório.

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
  do binário do app). A segurança é a RLS.
- A `service_role` NUNCA entra neste repositório nem em variável
  `NEXT_PUBLIC_`. Quando o webhook for real, ela entra SÓ nas variáveis de
  ambiente da Vercel, lida SÓ pelo código do webhook.
- Nenhuma escrita direta nas tabelas de assinatura pelo navegador: escolha
  e troca de plano passam pela RPC, e `active`/`past_due`/`canceled` serão
  movidos exclusivamente pelo webhook.

## Deploy

Vercel, projeto apontando para este repositório. Variáveis de ambiente:
as duas `NEXT_PUBLIC_` do `.env.example`. Nada mais até o provedor existir.
