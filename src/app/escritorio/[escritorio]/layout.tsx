import { CascaDeTrabalho } from "@/components/casca-de-trabalho";
import { contextoLogado } from "@/lib/contexto";
import { vinculoCom } from "@/lib/fluxos";

/**
 * A casca do escritório vive AQUI, e não dentro de cada página, por
 * velocidade: o Next preserva o layout entre navegações do mesmo fluxo, e
 * a barra lateral deixa de ser refeita (e o sino, reconsultado) a cada
 * troca de tela. `contextoLogado` é cache(), então layout e página
 * dividem a mesma autenticação dentro da requisição.
 *
 * O LAYOUT NÃO GUARDA: quem guarda é cada página, com `exigeEscritorio`.
 * Sem vínculo com o escritório da rota a casca simplesmente não entra, e a
 * página recebe o `children` cru para aplicar a guarda dela. Quem chegar com
 * um id inventado vê, no máximo, o instante do redirect; nunca a lateral de
 * uma banca alheia, porque a casca só monta com vínculo conferido.
 *
 * O comentário anterior dizia que planos e assinatura precisavam ser
 * alcançáveis SEM vínculo, e que era isso que impedia a guarda aqui. Deixou
 * de valer: o funil pré-escritório mudou para `/planos` e `/assinatura`,
 * fora deste segmento, porque quem ainda não tem banca não tem id para pôr
 * na rota e nunca chegava a estas telas.
 *
 * O id vem da ROTA, e mesmo sem guardar ele passa por `vinculoCom`: a casca
 * precisa saber QUAL escritório está aberto (o sino conta as notificações
 * dele, a lateral aponta para dentro dele), e id vindo do cliente não entra
 * na interface sem ser conferido contra os vínculos da sessão.
 */
export default async function LayoutDoEscritorio({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ escritorio: string }>;
}) {
  const { escritorio: escritorioId } = await params;
  const contexto = await contextoLogado();
  const vinculo = vinculoCom(contexto.fluxos, escritorioId);
  if (vinculo === null) return <>{children}</>;

  return (
    <CascaDeTrabalho
      fluxo="escritorio"
      fluxos={contexto.fluxos}
      escritorioId={vinculo.id}
    >
      {children}
    </CascaDeTrabalho>
  );
}
