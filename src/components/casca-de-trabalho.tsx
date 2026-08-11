import Link from "next/link";

import { sair } from "@/app/entrar/acoes";
import type { FluxosDoUsuario } from "@/lib/fluxos";
import { clienteDoServidor } from "@/lib/supabase/servidor";

export type FluxoDeTrabalho = "advogado" | "escritorio";

interface ItemDaLateral {
  rotulo: string;
  href: string;
  /** Prefixos de rota que acendem este item (o próprio href sempre conta). */
  tambem?: string[];
}

const itensPorFluxo: Record<FluxoDeTrabalho, ItemDaLateral[]> = {
  advogado: [
    {
      rotulo: "Mensagens",
      href: "/advogado",
      tambem: ["/advogado/conversas"],
    },
    { rotulo: "Casos", href: "/advogado/casos" },
    { rotulo: "Agenda", href: "/advogado/agenda" },
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
  caminhoAtivo,
  children,
}: {
  fluxo: FluxoDeTrabalho;
  fluxos: FluxosDoUsuario;
  caminhoAtivo: string;
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
  const acende = (item: ItemDaLateral) =>
    caminhoAtivo === item.href ||
    (item.tambem ?? []).some(
      (prefixo) =>
        caminhoAtivo === prefixo || caminhoAtivo.startsWith(`${prefixo}/`),
    ) ||
    (item.href !== "/advogado" &&
      item.href !== "/escritorio" &&
      caminhoAtivo.startsWith(`${item.href}/`));

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
  trocas.push({ rotulo: "Área do cliente", href: "/inicio", ativa: false });

  return (
    <div className="area-de-trabalho">
      <aside className="lateral">
        <Link href="/" className="marca marca-pequena">
          jurii<span className="ouro">.</span>
        </Link>

        <nav aria-label="Seções">
          {itens.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={acende(item) ? "ativa" : ""}
            >
              {item.rotulo}
              {item.rotulo === "Notificações" && naoLidas > 0 && (
                <span className="pilula-nao-lidas">{naoLidas}</span>
              )}
            </Link>
          ))}
        </nav>

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
