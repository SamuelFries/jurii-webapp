import { CascaDeTrabalho } from "@/components/casca-de-trabalho";
import { contextoLogado } from "@/lib/contexto";

/**
 * A casca do advogado vive AQUI, e não dentro de cada página, por
 * velocidade: o Next preserva o layout entre navegações do mesmo fluxo, e
 * a barra lateral deixa de ser refeita (e o sino, reconsultado) a cada
 * troca de tela. `contextoLogado` é cache(), então layout e página
 * dividem a mesma autenticação dentro da requisição.
 *
 * O LAYOUT NÃO GUARDA: a guarda continua em cada página (exigeAdvogado).
 * Mudar quem entra é decisão de rota, não de moldura, e um layout que
 * redireciona esconde essa decisão de quem lê a página. O irmão do
 * escritório mostra o preço de misturar as duas coisas: guardar lá
 * mataria a compra de plano, que existe antes do escritório.
 */
export default async function LayoutDoAdvogado({
  children,
}: {
  children: React.ReactNode;
}) {
  const contexto = await contextoLogado();
  if (!contexto.fluxos.advogadoAprovado) return <>{children}</>;

  return (
    <CascaDeTrabalho fluxo="advogado" fluxos={contexto.fluxos}>
      {children}
    </CascaDeTrabalho>
  );
}
