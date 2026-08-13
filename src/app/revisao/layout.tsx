import Link from "next/link";

import { sair } from "@/app/entrar/acoes";
import { contextoLogado } from "@/lib/contexto";

/**
 * A mesa de trabalho da REVISÃO, no mesmo formato dos fluxos de advogado e
 * escritório: lateral fixa, conteúdo rolando sozinho.
 *
 * É uma casca própria, e não a CascaDeTrabalho, por três ausências que lá
 * são presenças: a revisão não tem sino (as notificações são dos
 * profissionais), não oferece "Abrir escritório" (conta da casa não abre
 * banca) e o único item de navegação é a fila. Reaproveitar o CSS da mesa
 * e escrever vinte linhas de casca é mais barato que ensinar a casca dos
 * profissionais a fingir que a revisão é um terceiro fluxo.
 *
 * O layout NÃO guarda (o padrão das outras mesas): a guarda de equipe vive
 * na página. Para quem não é da equipe, a casca nem monta.
 */
export default async function LayoutDaRevisao({
  children,
}: {
  children: React.ReactNode;
}) {
  const contexto = await contextoLogado();
  if (!contexto.fluxos.equipeJurii) return <>{children}</>;

  const trocas: { rotulo: string; href: string }[] = [];
  if (contexto.fluxos.escritorio !== null) {
    trocas.push({
      rotulo: contexto.fluxos.escritorio.nome,
      href: "/escritorio",
    });
  }
  if (contexto.fluxos.advogadoAprovado) {
    trocas.push({ rotulo: "Área do advogado", href: "/advogado" });
  }

  return (
    <div className="area-de-trabalho">
      <aside className="lateral">
        <Link href="/" className="marca marca-pequena">
          jurii<span className="ouro">.</span>
        </Link>

        <nav aria-label="Seções">
          <Link href="/revisao" className="ativa" aria-current="page">
            Verificações
          </Link>
        </nav>

        <div className="rodape-da-lateral">
          {trocas.length > 0 && (
            <>
              <span className="rotulo-da-secao">Trocar de área</span>
              <nav aria-label="Trocar de área">
                {trocas.map((troca) => (
                  <Link key={troca.href} href={troca.href}>
                    {troca.rotulo}
                  </Link>
                ))}
              </nav>
            </>
          )}
          <nav aria-label="Conta">
            <Link href="/conta">Conta</Link>
          </nav>
          <form action={sair}>
            <button type="submit" className="discreto">
              Sair
            </button>
          </form>
        </div>
      </aside>
      {children}
    </div>
  );
}
