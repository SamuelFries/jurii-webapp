import Link from "next/link";

import { sair } from "@/app/entrar/acoes";
import { NavDaLateral } from "@/components/nav-da-lateral";
import { lateralDaRevisao } from "@/lib/dominio/lateral";
import { contextoLogado, escritorioPreferido } from "@/lib/contexto";
import { escritorioPadrao } from "@/lib/fluxos";

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
  const [contexto, preferido] = await Promise.all([
    contextoLogado(),
    escritorioPreferido(),
  ]);
  if (!contexto.fluxos.equipeJurii) return <>{children}</>;

  const trocas: { rotulo: string; href: string }[] = [];
  // UM item de escritório, e não um por vínculo: aqui a pergunta é "trocar
  // de ÁREA", e a escolha ENTRE escritórios é do seletor da mesa do
  // escritório. O escolhido é o último aberto (o cookie), conferido contra
  // os vínculos por `escritorioPadrao`, e a rota já leva o id porque a mesa
  // do escritório não abre sem ele.
  const escritorioDaTroca = escritorioPadrao(contexto.fluxos, preferido);
  if (escritorioDaTroca !== null) {
    trocas.push({
      rotulo:
        contexto.fluxos.escritorios.length > 1
          ? "Área do escritório"
          : escritorioDaTroca.nome,
      href: `/escritorio/${escritorioDaTroca.id}`,
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

        {/* A mesma navegação dos outros fluxos: cliente, para acender o
            item na hora do clique. O sino não existe aqui, então a
            contagem vai zerada e a pílula nunca aparece. */}
        <NavDaLateral
          itens={lateralDaRevisao}
          naoLidas={0}
          escopo="lawyer"
          lawFirmId={null}
        />

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
            {/* Também aqui: quem revisa é gente da casa, mas a conta é a
                mesma e as perguntas de conta e de escritório valem igual.
                Sem o item nesta mesa, a ajuda sumiria para quem entra
                direto na fila. */}
            <Link href="/ajuda">Ajuda</Link>
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
