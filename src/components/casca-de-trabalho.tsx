import Link from "next/link";

import { sair } from "@/app/entrar/acoes";
import type { FluxosDoUsuario } from "@/lib/fluxos";
import { clienteDoServidor } from "@/lib/supabase/servidor";

import { NavDaLateral, type ItemDaLateral } from "./nav-da-lateral";

export type FluxoDeTrabalho = "advogado" | "escritorio";

const itensPorFluxo: Record<FluxoDeTrabalho, ItemDaLateral[]> = {
  advogado: [
    {
      rotulo: "Mensagens",
      href: "/advogado",
      tambem: ["/advogado/conversas"],
    },
    { rotulo: "Casos", href: "/advogado/casos" },
    { rotulo: "Agenda", href: "/advogado/agenda" },
    { rotulo: "Alcance", href: "/advogado/alcance" },
    { rotulo: "Meu perfil", href: "/advogado/perfil" },
    { rotulo: "Notificações", href: "/advogado/notificacoes" },
  ],
  escritorio: [
    { rotulo: "Visão geral", href: "/escritorio" },
    {
      rotulo: "Mensagens",
      href: "/escritorio/mensagens",
      tambem: ["/escritorio/conversas"],
    },
    { rotulo: "Casos", href: "/escritorio/casos" },
    { rotulo: "Equipe", href: "/escritorio/equipe" },
    { rotulo: "Alcance", href: "/escritorio/alcance" },
    { rotulo: "Perfil", href: "/escritorio/perfil" },
    { rotulo: "Notificações", href: "/escritorio/notificacoes" },
    {
      rotulo: "Assinatura",
      href: "/escritorio/assinatura",
      tambem: ["/escritorio/planos"],
    },
  ],
};

/**
 * A casca dos fluxos PROFISSIONAIS: barra lateral fixa e conteúdo na tela
 * inteira, porque isto fica aberto o dia todo como ferramenta de trabalho.
 * O fluxo do cliente continua na casca de topo: lá a pessoa visita; aqui a
 * pessoa trabalha.
 */
export async function CascaDeTrabalho({
  fluxo,
  fluxos,
  children,
}: {
  fluxo: FluxoDeTrabalho;
  fluxos: FluxosDoUsuario;
  children: React.ReactNode;
}) {
  // Contagem do sino no escopo do fluxo, a mesma régua do app.
  const escopoDoSino = fluxo === "advogado" ? "lawyer" : "firm";
  const supabase = await clienteDoServidor();
  let contagem = supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("scope", escopoDoSino)
    .filter("read_at", "is", null);
  if (fluxo === "escritorio" && fluxos.escritorio !== null) {
    contagem = contagem.eq("law_firm_id", fluxos.escritorio.id);
  }
  const { count } = await contagem;
  const naoLidas = count ?? 0;

  const itens = itensPorFluxo[fluxo];

  const trocas: { rotulo: string; href: string; ativa: boolean }[] = [];
  if (fluxos.escritorio !== null) {
    trocas.push({
      rotulo: fluxos.escritorio.nome,
      href: "/escritorio",
      ativa: fluxo === "escritorio",
    });
  }
  if (fluxos.advogadoAprovado) {
    trocas.push({
      rotulo: "Área do advogado",
      href: "/advogado",
      ativa: fluxo === "advogado",
    });
  }
  // A "Área do cliente" NAO entra mais na troca: o webapp virou ferramenta
  // profissional e /inicio deixou de existir. Item apontando para rota
  // apagada e link morto na lateral de toda pagina.

  return (
    <div className="area-de-trabalho">
      <aside className="lateral">
        <Link href="/" className="marca marca-pequena">
          jurii<span className="ouro">.</span>
        </Link>

        <NavDaLateral
          itens={itens}
          naoLidas={naoLidas}
          escopo={escopoDoSino}
          lawFirmId={fluxos.escritorio?.id ?? null}
        />

        <div className="rodape-da-lateral">
          {trocas.length > 1 && (
            <>
              <span className="rotulo-da-secao">Trocar de área</span>
              <nav aria-label="Trocar de área">
                {trocas.map((troca) => (
                  <Link
                    key={troca.href}
                    href={troca.href}
                    className={troca.ativa ? "ativa" : ""}
                  >
                    {troca.rotulo}
                  </Link>
                ))}
              </nav>
            </>
          )}
          <nav aria-label="Conta">
            {/* Funcionário da JURII que também é advogado ou tem escritório
                precisa de um caminho para a revisão; sem isto, só digitando
                a URL. Não confundir com papel de escritório: isto é gente da
                casa, e some para todo mundo que não for. */}
            {fluxos.equipeJurii && (
              <Link href="/revisao">Revisar verificações</Link>
            )}
            {/* Só para quem NÃO tem escritório: quem já tem, tem o painel. */}
            {fluxos.escritorio === null && (
              <Link href="/abrir-escritorio">Abrir escritório</Link>
            )}
            <Link href="/conta">Conta</Link>
          </nav>
          <form action={sair}>
            <button type="submit" className="discreto">
              Sair
            </button>
          </form>
        </div>
      </aside>

      <div className="conteudo-de-trabalho">{children}</div>
    </div>
  );
}
