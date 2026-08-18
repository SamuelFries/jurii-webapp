import Link from "next/link";

import { sair } from "@/app/entrar/acoes";
import {
  lateralDoAdvogado,
  lateralDoEscritorio,
  type FluxoDeTrabalho,
} from "@/lib/dominio/lateral";
import type { FluxosDoUsuario } from "@/lib/fluxos";
import { clienteDoServidor } from "@/lib/supabase/servidor";

import { NavDaLateral } from "./nav-da-lateral";
import { Icone, type NomeDoIcone } from "./icone";
import { Toasts } from "./toasts";
import { SeletorDeEscritorio } from "./seletor-de-escritorio";

export type { FluxoDeTrabalho };

/**
 * A casca dos fluxos PROFISSIONAIS: barra lateral fixa e conteúdo na tela
 * inteira, porque isto fica aberto o dia todo como ferramenta de trabalho.
 * O fluxo do cliente continua na casca de topo: lá a pessoa visita; aqui a
 * pessoa trabalha.
 */
export async function CascaDeTrabalho({
  fluxo,
  fluxos,
  escritorioId = null,
  children,
}: {
  fluxo: FluxoDeTrabalho;
  fluxos: FluxosDoUsuario;
  /**
   * QUAL escritório está aberto. Vem da rota, já validado contra os vínculos
   * por `exigeEscritorio`. Nulo no fluxo do advogado.
   */
  escritorioId?: string | null;
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
  // O sino conta as do escritório ABERTO, e não a soma de todos: quem tem
  // duas bancas quer saber o que chegou nesta.
  if (fluxo === "escritorio" && escritorioId !== null) {
    contagem = contagem.eq("law_firm_id", escritorioId);
  }
  const { count } = await contagem;
  const naoLidas = count ?? 0;

  const itens =
    fluxo === "escritorio" && escritorioId !== null
      ? lateralDoEscritorio(escritorioId)
      : lateralDoAdvogado;

  // A troca de ÁREA continua sendo entre fluxos. Com dois ou mais
  // escritórios, um só entra aqui (o aberto, ou o primeiro): a escolha ENTRE
  // escritórios é do seletor logo acima, e repetir a lista nas duas seções
  // faria a mesma pergunta duas vezes com respostas diferentes.
  const escritorioDaTroca =
    fluxos.escritorios.find((vinculo) => vinculo.id === escritorioId) ??
    fluxos.escritorios[0] ??
    null;
  const trocas: {
    rotulo: string;
    href: string;
    ativa: boolean;
    icone: NomeDoIcone;
  }[] = [];
  if (escritorioDaTroca !== null) {
    trocas.push({
      rotulo:
        fluxos.escritorios.length > 1
          ? "Área do escritório"
          : escritorioDaTroca.nome,
      href: `/escritorio/${escritorioDaTroca.id}`,
      ativa: fluxo === "escritorio",
      icone: "escritorio",
    });
  }
  if (fluxos.advogadoAprovado) {
    trocas.push({
      rotulo: "Área do advogado",
      href: "/advogado",
      ativa: fluxo === "advogado",
      icone: "advogado",
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
          lawFirmId={escritorioId}
        />

        <div className="rodape-da-lateral">
          <SeletorDeEscritorio
            escritorios={fluxos.escritorios}
            ativo={escritorioId ?? ""}
            fluxo={fluxo}
          />
          {trocas.length > 1 && (
            <>
              <span className="rotulo-da-secao">Trocar de área</span>
              <nav aria-label="Trocar de área">
                {trocas.map((troca) => (
                  <Link
                    key={troca.href}
                    href={troca.href}
                    className={troca.ativa ? "ativa" : ""}
                    aria-current={troca.ativa ? "true" : undefined}
                  >
                    <Icone nome={troca.icone} className="icone-do-item" />
                    <span className="rotulo-do-item">{troca.rotulo}</span>
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
              <Link href="/revisao">
                <Icone nome="verificacoes" className="icone-do-item" />
                <span className="rotulo-do-item">Revisar verificações</span>
              </Link>
            )}
            {/* SEMPRE visível. Escondia de quem já era sócio, porque a
                licença era por pessoa e a segunda banca era impossível. Com
                a cobrança por escritório ela deixou de ser: abrir a segunda
                é comprar a segunda licença, e a própria tela explica isso a
                quem chega sem licença sobrando. Esconder o caminho seria
                decidir pela pessoa uma coisa que ela pode fazer. */}
            <Link href="/abrir-escritorio">
              <Icone nome="abrir" className="icone-do-item" />
              <span className="rotulo-do-item">Abrir escritório</span>
            </Link>
            <Link href="/conta">
              <Icone nome="conta" className="icone-do-item" />
              <span className="rotulo-do-item">Conta</span>
            </Link>
            {/* A ajuda vive ao lado da conta, e não num item de topo: ela é
                consulta pontual, não parte do trabalho. Fica em todos os
                fluxos porque a página é neutra (não pede vínculo nem
                verificação), e sem link aqui só se chegaria a ela digitando
                o endereço. */}
            <Link href="/ajuda">
              <Icone nome="ajuda" className="icone-do-item" />
              <span className="rotulo-do-item">Ajuda</span>
            </Link>
          </nav>
          <form action={sair}>
            <button type="submit" className="discreto item-de-sair">
              <Icone nome="sair" className="icone-do-item" />
              <span className="rotulo-do-item">Sair</span>
            </button>
          </form>
        </div>
      </aside>

      <div className="conteudo-de-trabalho">{children}</div>
      <Toasts />
    </div>
  );
}
