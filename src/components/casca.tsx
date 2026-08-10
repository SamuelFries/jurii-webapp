import Link from "next/link";

import type { FluxosDoUsuario } from "@/lib/fluxos";
import { sair } from "@/app/entrar/acoes";
import { clienteDoServidor } from "@/lib/supabase/servidor";

export type FluxoAtivo = "cliente" | "advogado" | "escritorio";

interface Aba {
  rotulo: string;
  href: string;
}

const abasPorFluxo: Record<FluxoAtivo, Aba[]> = {
  cliente: [
    { rotulo: "Início", href: "/inicio" },
    { rotulo: "Conversas", href: "/conversas" },
    { rotulo: "Meus casos", href: "/casos" },
    { rotulo: "Favoritos", href: "/favoritos" },
  ],
  advogado: [
    { rotulo: "Mensagens", href: "/advogado" },
    { rotulo: "Casos", href: "/advogado/casos" },
  ],
  escritorio: [
    { rotulo: "Visão geral", href: "/escritorio" },
    { rotulo: "Mensagens", href: "/escritorio/mensagens" },
    { rotulo: "Casos", href: "/escritorio/casos" },
    { rotulo: "Equipe", href: "/escritorio/equipe" },
    { rotulo: "Assinatura", href: "/escritorio/assinatura" },
  ],
};

/**
 * A casca de toda página logada: marca, as abas do fluxo ativo e a troca de
 * fluxo. A troca segue a regra do app (utils/firm_area_access.dart e
 * main.dart): só aparece fluxo que a pessoa TEM, porque opção que aparece e
 * não funciona é pior que opção ausente.
 */
export async function Casca({
  fluxo,
  fluxos,
  caminhoAtivo,
  children,
}: {
  fluxo: FluxoAtivo;
  fluxos: FluxosDoUsuario;
  caminhoAtivo: string;
  children: React.ReactNode;
}) {
  // O contador do sino, do ESCOPO do fluxo ativo (o mesmo recorte do app:
  // cada fluxo tem o seu sino). Contagem por cabeçalho, sem trazer linhas.
  const escopoDoSino =
    fluxo === "cliente" ? "client" : fluxo === "advogado" ? "lawyer" : "firm";
  const rotaDoSino =
    fluxo === "cliente"
      ? "/notificacoes"
      : fluxo === "advogado"
        ? "/advogado/notificacoes"
        : "/escritorio/notificacoes";
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

  // Profissional primeiro: o webapp existe para o dia de trabalho de
  // advogados e escritórios; o fluxo do cliente fica por último.
  const trocas: { rotulo: string; href: string; fluxo: FluxoAtivo }[] = [];
  if (fluxos.escritorio !== null) {
    trocas.push({
      rotulo: "Escritório",
      href: "/escritorio",
      fluxo: "escritorio",
    });
  }
  if (fluxos.advogadoAprovado) {
    trocas.push({ rotulo: "Advogado", href: "/advogado", fluxo: "advogado" });
  }
  trocas.push({ rotulo: "Cliente", href: "/inicio", fluxo: "cliente" });

  return (
    <>
      <header className="cabecalho">
        <div className="cabecalho-interno">
          <div className="linha-topo">
            <Link href="/" className="marca marca-pequena">
              jurii<span className="ouro">.</span>
            </Link>
            <div className="acoes-do-topo">
              <Link
                href={rotaDoSino}
                className="sino"
                aria-label={
                  naoLidas > 0
                    ? `Notificações, ${naoLidas} não lidas`
                    : "Notificações"
                }
              >
                Notificações
                {naoLidas > 0 && (
                  <span className="pilula-nao-lidas">{naoLidas}</span>
                )}
              </Link>
              {trocas.length > 1 && (
                <nav className="troca-de-fluxo" aria-label="Trocar de área">
                  {trocas.map((troca) => (
                    <Link
                      key={troca.fluxo}
                      href={troca.href}
                      className={troca.fluxo === fluxo ? "ativa" : ""}
                    >
                      {troca.rotulo}
                    </Link>
                  ))}
                </nav>
              )}
              <form action={sair}>
                <button type="submit" className="discreto">
                  Sair
                </button>
              </form>
            </div>
          </div>
          <nav className="abas" aria-label="Seções">
            {abasPorFluxo[fluxo].map((aba) => (
              <Link
                key={aba.href}
                href={aba.href}
                className={
                  caminhoAtivo === aba.href ||
                  (aba.href !== "/escritorio" &&
                    aba.href !== "/advogado" &&
                    caminhoAtivo.startsWith(`${aba.href}/`))
                    ? "ativa"
                    : ""
                }
              >
                {aba.rotulo}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="pagina pagina-larga">{children}</main>
    </>
  );
}
