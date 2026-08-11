import Link from "next/link";

import { CascaDeTrabalho } from "@/components/casca-de-trabalho";
import { contextoLogado, exigeAdvogado } from "@/lib/contexto";
import {
  agrupaPorDiaDeAgenda,
  compromissoDaLinha,
  isoUtcParaLocal,
  rotuloDoHorarioDoCompromisso,
  rotuloDoStatusDoCompromisso,
} from "@/lib/dominio/agenda";

import {
  atualizarCompromisso,
  cancelarCompromisso,
  criarCompromisso,
} from "./acoes";

export const dynamic = "force-dynamic";

/**
 * A agenda do advogado, espelho da tela do app: próximos agrupados por dia
 * (Hoje, Amanhã, ...), passados sob demanda, criar, editar e cancelar
 * pelas MESMAS RPCs. Cancelar não apaga: vira cancelled e some da lista,
 * como no app.
 */
export default async function AgendaDoAdvogado({
  searchParams,
}: {
  searchParams: Promise<{ janela?: string; ok?: string; erro?: string }>;
}) {
  const { janela, ok, erro } = await searchParams;
  const contexto = await contextoLogado();
  exigeAdvogado(contexto);
  const passados = janela === "passados";

  const agora = new Date();
  const corte = agora.toISOString();

  let consulta = contexto.supabase
    .from("appointments")
    .select()
    .eq("role", "lawyer")
    .neq("status", "cancelled");
  consulta = passados
    ? consulta.lt("starts_at", corte)
    : consulta.gte("starts_at", corte);
  const { data } = await consulta
    .order("starts_at", { ascending: !passados })
    .limit(60);

  const compromissos = ((data as unknown[]) ?? []).map((linha) =>
    compromissoDaLinha(linha as Record<string, unknown>),
  );
  const grupos = agrupaPorDiaDeAgenda(compromissos, agora);

  return (
    <CascaDeTrabalho
      fluxo="advogado"
      fluxos={contexto.fluxos}
      caminhoAtivo="/advogado/agenda"
    >
      <div className="pagina-de-trabalho">
        <div className="miolo" style={{ maxWidth: 720 }}>
          <h1 style={{ marginTop: 0 }}>Agenda</h1>
          <p className="subtitulo">
            Audiências, reuniões e prazos de atendimento, em horário de
            Brasília.
          </p>

          {erro !== undefined && <p className="erro">{erro}</p>}
          {ok === "criado" && <p className="aviso-bom">Compromisso criado.</p>}
          {ok === "salvo" && <p className="aviso-bom">Compromisso salvo.</p>}
          {ok === "cancelado" && (
            <p className="aviso-bom">Compromisso cancelado.</p>
          )}

          <nav className="troca-de-fluxo" aria-label="Janela">
            <Link href="/advogado/agenda" className={passados ? "" : "ativa"}>
              Próximos
            </Link>
            <Link
              href="/advogado/agenda?janela=passados"
              className={passados ? "ativa" : ""}
            >
              Passados
            </Link>
          </nav>

          {!passados && (
            <details className="propor-caso">
              <summary>Novo compromisso</summary>
              <form
                action={criarCompromisso}
                className="cartao"
                style={{ marginTop: 10 }}
              >
                <label htmlFor="novo-titulo">Título</label>
                <input
                  id="novo-titulo"
                  type="text"
                  name="titulo"
                  required
                  placeholder="Ex.: Audiência trabalhista"
                />
                <div className="acoes-em-linha">
                  <div style={{ flex: 1 }}>
                    <label htmlFor="novo-inicio">Início</label>
                    <input
                      id="novo-inicio"
                      type="datetime-local"
                      name="inicio"
                      required
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label htmlFor="novo-fim">Fim</label>
                    <input
                      id="novo-fim"
                      type="datetime-local"
                      name="fim"
                      required
                    />
                  </div>
                </div>
                <label htmlFor="novo-com-quem">Com quem (opcional)</label>
                <input
                  id="novo-com-quem"
                  type="text"
                  name="com_quem"
                  placeholder="Ex.: Ana Souza"
                />
                <label htmlFor="novo-local">Local (opcional)</label>
                <input
                  id="novo-local"
                  type="text"
                  name="local"
                  placeholder="Ex.: Fórum Central, sala 302, ou on-line"
                />
                <label htmlFor="nova-area">Área (opcional)</label>
                <input
                  id="nova-area"
                  type="text"
                  name="area"
                  placeholder="Ex.: Direito Trabalhista"
                />
                <button type="submit">Criar compromisso</button>
              </form>
            </details>
          )}

          {grupos.length === 0 ? (
            <p className="vazio" style={{ marginTop: 16 }}>
              {passados
                ? "Nenhum compromisso passado registrado."
                : "Nada marcado por vir. Crie o primeiro compromisso acima."}
            </p>
          ) : (
            grupos.map((grupo) => (
              <section key={grupo.dia}>
                <h2 className="secao">{grupo.dia}</h2>
                <div className="lista-empilhada">
                  {grupo.itens.map((compromisso) => (
                    <div key={compromisso.id} className="cartao-de-lista">
                      <span className="conteudo">
                        <span className="titulo">
                          {compromisso.titulo}
                          <span
                            className={
                              compromisso.status === "confirmed"
                                ? "selo dourado"
                                : "selo"
                            }
                          >
                            {rotuloDoStatusDoCompromisso[compromisso.status]}
                          </span>
                        </span>
                        <p className="linha-2">
                          {rotuloDoHorarioDoCompromisso(compromisso)}
                          {compromisso.comQuem !== ""
                            ? ` · ${compromisso.comQuem}`
                            : ""}
                          {compromisso.local !== ""
                            ? ` · ${compromisso.local}`
                            : ""}
                        </p>
                        {compromisso.casoId !== null && (
                          <p className="linha-2">
                            <Link
                              href={`/advogado/casos/${compromisso.casoId}`}
                              className="link-do-nome"
                            >
                              Abrir o caso ligado
                            </Link>
                          </p>
                        )}
                        {!passados && (
                          <details>
                            <summary
                              className="detalhe"
                              style={{ cursor: "pointer" }}
                            >
                              Editar ou cancelar
                            </summary>
                            <form
                              action={atualizarCompromisso}
                              style={{ marginTop: 8 }}
                            >
                              <input
                                type="hidden"
                                name="id"
                                value={compromisso.id}
                              />
                              <label>Título</label>
                              <input
                                type="text"
                                name="titulo"
                                required
                                defaultValue={compromisso.titulo}
                              />
                              <div className="acoes-em-linha">
                                <div style={{ flex: 1 }}>
                                  <label>Início</label>
                                  <input
                                    type="datetime-local"
                                    name="inicio"
                                    required
                                    defaultValue={isoUtcParaLocal(
                                      compromisso.comecaEm,
                                    )}
                                  />
                                </div>
                                <div style={{ flex: 1 }}>
                                  <label>Fim</label>
                                  <input
                                    type="datetime-local"
                                    name="fim"
                                    required
                                    defaultValue={isoUtcParaLocal(
                                      compromisso.terminaEm,
                                    )}
                                  />
                                </div>
                              </div>
                              <label>Com quem</label>
                              <input
                                type="text"
                                name="com_quem"
                                defaultValue={compromisso.comQuem}
                              />
                              <label>Local</label>
                              <input
                                type="text"
                                name="local"
                                defaultValue={compromisso.local}
                              />
                              <label>Área</label>
                              <input
                                type="text"
                                name="area"
                                defaultValue={compromisso.area}
                              />
                              <button type="submit" className="secundario">
                                Salvar alterações
                              </button>
                            </form>
                            <form
                              action={cancelarCompromisso}
                              style={{ marginTop: 8 }}
                            >
                              <input
                                type="hidden"
                                name="id"
                                value={compromisso.id}
                              />
                              <button
                                type="submit"
                                className="discreto"
                                style={{ color: "var(--danger)" }}
                              >
                                Cancelar compromisso
                              </button>
                            </form>
                          </details>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      </div>
    </CascaDeTrabalho>
  );
}
