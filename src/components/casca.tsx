import Link from "next/link";

import type { FluxosDoUsuario } from "@/lib/fluxos";
import { sair } from "@/app/entrar/acoes";

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
  ],
  advogado: [
    { rotulo: "Mensagens", href: "/advogado" },
    { rotulo: "Casos", href: "/advogado/casos" },
  ],
  escritorio: [
    { rotulo: "Mensagens", href: "/escritorio" },
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
export function Casca({
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
