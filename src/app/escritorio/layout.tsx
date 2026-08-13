import { CascaDeTrabalho } from "@/components/casca-de-trabalho";
import { contextoLogado } from "@/lib/contexto";

/**
 * A casca do escritório vive AQUI, e não dentro de cada página, por
 * velocidade: o Next preserva o layout entre navegações do mesmo fluxo, e
 * a barra lateral deixa de ser refeita (e o sino, reconsultado) a cada
 * troca de tela. `contextoLogado` é cache(), então layout e página
 * dividem a mesma autenticação dentro da requisição.
 *
 * O LAYOUT NÃO GUARDA, de propósito. A tentação era chamar exigeEscritorio
 * aqui e ganhar a guarda "por construção", mas isso QUEBRARIA a compra de
 * plano: /escritorio/planos e /escritorio/assinatura são alcançáveis SEM
 * vínculo ativo, porque o contratante escolhe o plano antes de o
 * escritório existir. Guardar aqui redirecionaria antes de a página
 * renderizar, e o funil de pagamento morreria em silêncio.
 *
 * Sem escritório, então, a casca não entra: essas duas páginas trazem
 * cabeçalho próprio, e as outras seguem com a guarda delas.
 */
export default async function LayoutDoEscritorio({
  children,
}: {
  children: React.ReactNode;
}) {
  const contexto = await contextoLogado();
  if (contexto.fluxos.escritorio === null) return <>{children}</>;

  return (
    <CascaDeTrabalho fluxo="escritorio" fluxos={contexto.fluxos}>
      {children}
    </CascaDeTrabalho>
  );
}
