import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  adicionarAtualizacao,
  atribuirAdvogado,
  definirCnj,
  encerrarCaso,
  reabrirCaso,
} from "@/app/casos/acoes-detalhe";
import { carregaContextoDoCaso } from "@/lib/caso-servidor";
import {
  atualizacaoDaLinha,
  detalheDoCasoDaLinha,
  formataCnj,
  linhaDoTempoDoCaso,
  movimentacaoDaLinha,
  pendenciasDoCaso,
} from "@/lib/dominio/caso-detalhe";
import { primeiroNome, separadorDeDia } from "@/lib/dominio/chat-aberto";
import {
  esperaDesde,
  esperandoHaMuito,
  rotuloDeHorario,
} from "@/lib/dominio/conversas";
import { membroDaLinha } from "@/lib/dominio/equipe";

import { Icone } from "./icone";

/**
 * O detalhe do caso: "onde este caso está e o que eu faço com ele".
 *
 * COMPLEMENTA O CHAT, não o duplica. O chat responde "o que estão me dizendo
 * agora"; aqui não há mensagem nenhuma, há o estado do caso, a linha do
 * tempo do que aconteceu, os documentos e as ações, e um caminho de volta
 * para a conversa.
 *
 * As permissões vêm do SERVIDOR (fetch_case_for_current_user): can_manage
 * libera registrar atualização e editar o CNJ; can_manage_lifecycle libera
 * atribuir, encerrar e reabrir. A tela obedece e nunca oferece o que o banco
 * vai negar.
 *
 * SOBRE A SECRETÁRIA, decisão de produto e não bug: ela pode ter
 * can_manage_lifecycle (gerir o caso: atribuir, encerrar) e NÃO ler a
 * correspondência privada do caso (fetch_case_updates/movements devolvem
 * vazio para quem não é participante). Quando isso acontece, a tela diz que
 * o histórico não está disponível para o papel, e nunca "nenhuma atualização
 * registrada", que seria mentira.
 */
export async function DetalheDoCaso({
  supabase,
  casoId,
  voltarPara,
  listaHref,
  conversaHref,
  erro,
  ok,
  escritorioId = null,
  podeAtribuir = false,
}: {
  supabase: SupabaseClient;
  casoId: string;
  /** A rota deste detalhe, para as ações voltarem para o fluxo certo. */
  voltarPara: string;
  listaHref: string;
  /** Monta o link da conversa ligada, no fluxo de quem chama. */
  conversaHref: (conversaId: string) => string;
  erro?: string;
  ok?: string;
  escritorioId?: string | null;
  podeAtribuir?: boolean;
}) {
  const [detalheRes, atualizacoesRes, movimentacoesRes] = await Promise.all([
    supabase.rpc("fetch_case_for_current_user", { case_id_value: casoId }),
    supabase.rpc("fetch_case_updates", { case_id_value: casoId }),
    supabase.rpc("fetch_case_movements", { case_id_value: casoId }),
  ]);

  const linhaDoDetalhe = ((detalheRes.data as unknown[]) ?? [])[0];
  if (linhaDoDetalhe == null) {
    return (
      <div className="painel-vazio">
        <Icone nome="casos" tamanho={28} className="icone-do-vazio" />
        <p className="titulo-do-vazio">Caso indisponível</p>
        <p>Este caso não está disponível para você. Ele pode ter sido removido.</p>
        <Link className="botao secundario compacto" href={listaHref}>
          Voltar para os casos
        </Link>
      </div>
    );
  }

  const caso = detalheDoCasoDaLinha(linhaDoDetalhe as Record<string, unknown>);
  const atualizacoes = ((atualizacoesRes.data as unknown[]) ?? []).map(
    (linha) => atualizacaoDaLinha(linha as Record<string, unknown>),
  );
  const movimentacoes = ((movimentacoesRes.data as unknown[]) ?? []).map(
    (linha) => movimentacaoDaLinha(linha as Record<string, unknown>),
  );

  const [contexto, advogados] = await Promise.all([
    carregaContextoDoCaso(supabase, casoId, escritorioId, caso.advogadoId),
    podeAtribuir && escritorioId !== null
      ? supabase
          .from("law_firm_members")
          .select(
            "profile_id, lawyer_id, roles, member_role, role, status, profiles(full_name, initials, avatar_url)",
          )
          .eq("law_firm_id", escritorioId)
          .eq("status", "active")
          .then((r) =>
            ((r.data as unknown[]) ?? [])
              .map((linha) => membroDaLinha(linha as Record<string, unknown>))
              .filter((membro) => membro.papeis.includes("lawyer")),
          )
      : Promise.resolve([]),
  ]);

  const agora = new Date();
  const linhaDoTempo = linhaDoTempoDoCaso(atualizacoes, movimentacoes);
  const pendencias = pendenciasDoCaso({
    encerrado: caso.encerrado,
    advogadoId: caso.advogadoId,
    clienteAguardaDesde: contexto.clienteAguardaDesde,
  });

  // A ASSIMETRIA DELIBERADA: quem gerencia (can_manage_lifecycle) mas não
  // participa não recebe o histórico. Zero linhas de updates E de movements
  // para quem não pode registrar (can_manage=false) e não é cliente é a
  // assinatura desse papel. Não é "caso sem histórico": é histórico fora do
  // alcance deste papel, e a tela diz isso.
  const historicoForaDoAlcance =
    linhaDoTempo.length === 0 && !caso.podeGerenciar && !caso.vendoComoCliente;

  const iniciaisDoCliente = caso.cliente
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="detalhe-do-caso">
      {/* ---- A. CABEÇALHO: cliente em destaque, área, status; título do
          caso na segunda linha; responsável e volta para a conversa. ---- */}
      <div className="cabecalho-do-caso">
        <Link
          href={listaHref}
          className="voltar"
          aria-label="Voltar para Casos"
          title="Voltar para Casos"
        >
          <Icone nome="seta-direita" tamanho={16} className="seta-de-voltar" />
        </Link>
        <span className="avatar pequeno" aria-hidden>
          {iniciaisDoCliente || "?"}
        </span>
        <span className="quem">
          <span className="linha-1">
            <span className="cliente">{caso.cliente}</span>
            <span className="area">{caso.area}</span>
            <span className={caso.encerrado ? "selo" : "selo dourado"}>
              {caso.statusRotulo}
            </span>
          </span>
          <span className="linha-2" title={caso.titulo}>
            {caso.titulo}
          </span>
        </span>

        <span className="atendimento">
          {contexto.responsavelNome !== null ? (
            <span
              className="responsavel"
              title={`Responsável: ${contexto.responsavelNome}`}
            >
              <Icone nome="perfil" tamanho={14} />
              Responsável: {primeiroNome(contexto.responsavelNome)}
            </span>
          ) : caso.advogadoId === null && !caso.encerrado ? (
            <span className="responsavel sem-responsavel">
              <Icone nome="alerta" tamanho={14} />
              Sem responsável
            </span>
          ) : null}
          {contexto.conversaId !== null && (
            <Link
              className="link-do-caso"
              href={conversaHref(contexto.conversaId)}
              title="Abrir a conversa deste caso"
            >
              <Icone nome="mensagens" tamanho={14} />
              Abrir conversa
            </Link>
          )}
        </span>

        {/* ---- E. AÇÕES por consequência: a primária à vista, as de peso
            no menu. Cada uma só para quem o banco aceita. ---- */}
        <span className="acoes-do-chat">
          {caso.podeGerenciar && !caso.encerrado && (
            <details className="propor-caso acao-primaria">
              <summary>Registrar atualização</summary>
              <form action={adicionarAtualizacao} className="cartao">
                <input type="hidden" name="caso" value={caso.id} />
                <input type="hidden" name="voltar" value={voltarPara} />
                <label htmlFor="titulo-da-atualizacao">Título</label>
                <input
                  id="titulo-da-atualizacao"
                  type="text"
                  name="titulo"
                  required
                  autoFocus
                  placeholder="Ex.: Audiência marcada"
                />
                <label htmlFor="corpo-da-atualizacao">Detalhes (opcional)</label>
                <textarea id="corpo-da-atualizacao" name="corpo" rows={3} />
                <button type="submit">Registrar</button>
              </form>
            </details>
          )}
          {(podeAtribuir || caso.podeEncerrar) && (
            <details className="moderacao">
              <summary aria-label="Mais ações do caso" title="Mais ações">
                <span aria-hidden>···</span>
              </summary>
              <div className="cartao painel-de-moderacao">
                {podeAtribuir && escritorioId !== null && !caso.encerrado && (
                  <>
                    <strong>Advogado responsável</strong>
                    {advogados.length === 0 ? (
                      <p className="detalhe">
                        Nenhum advogado ativo na equipe para atribuir.
                      </p>
                    ) : (
                      <form action={atribuirAdvogado}>
                        <input type="hidden" name="caso" value={caso.id} />
                        <input type="hidden" name="escritorio" value={escritorioId} />
                        <input type="hidden" name="voltar" value={voltarPara} />
                        <select
                          name="advogado"
                          defaultValue={caso.advogadoId ?? ""}
                          className="seletor"
                          aria-label="Quem assume este caso"
                        >
                          <option value="" disabled>
                            Escolha um advogado
                          </option>
                          {advogados.map((advogado) => (
                            <option key={advogado.profileId} value={advogado.profileId}>
                              {advogado.nome}
                            </option>
                          ))}
                        </select>
                        <button type="submit" className="secundario compacto">
                          Atribuir
                        </button>
                      </form>
                    )}
                  </>
                )}
                {caso.podeEncerrar && (
                  <>
                    <strong style={{ marginTop: podeAtribuir ? 12 : 0, display: "block" }}>
                      {caso.encerrado ? "Reabrir caso" : "Encerrar caso"}
                    </strong>
                    {/* Confirmação curta e inline: um details dentro do
                        menu, sem modal. Encerrar avisa o cliente e o
                        convida a avaliar, então a frase diz isso. */}
                    {caso.encerrado ? (
                      <form action={reabrirCaso}>
                        <input type="hidden" name="caso" value={caso.id} />
                        <input type="hidden" name="voltar" value={voltarPara} />
                        <button type="submit" className="secundario compacto">
                          Reabrir
                        </button>
                      </form>
                    ) : (
                      <details className="confirmar-encerrar">
                        <summary className="botao secundario compacto">
                          Encerrar…
                        </summary>
                        <p className="detalhe">
                          O cliente é avisado e convidado a avaliar o
                          atendimento. Dá para reabrir depois.
                        </p>
                        <form action={encerrarCaso}>
                          <input type="hidden" name="caso" value={caso.id} />
                          <input type="hidden" name="voltar" value={voltarPara} />
                          <button type="submit" className="perigo compacto">
                            Confirmar encerramento
                          </button>
                        </form>
                      </details>
                    )}
                  </>
                )}
              </div>
            </details>
          )}
        </span>
      </div>

      {erro !== undefined && <p className="erro">{erro}</p>}
      {ok === "atualizacao" && <p className="aviso-bom">Atualização registrada.</p>}
      {ok === "atribuido" && <p className="aviso-bom">Responsável atribuído.</p>}
      {ok === "cnj" && <p className="aviso-bom">Número do processo salvo.</p>}
      {ok === "encerrado" && <p className="aviso-bom">Caso encerrado.</p>}
      {ok === "reaberto" && <p className="aviso-bom">Caso reaberto.</p>}

      {/* ---- B. FAIXA DE ESTADO, só quando há o que atender. Mesma
          linguagem, limiar e cor do chat. ---- */}
      {pendencias.length > 0 && (
        <div className="faixas-de-estado">
          {pendencias.map((p) =>
            p.tipo === "cliente_aguarda" && p.desde !== null ? (
              <p
                key={p.tipo}
                className={
                  esperandoHaMuito(p.desde, agora)
                    ? "faixa-de-estado espera-longa"
                    : "faixa-de-estado"
                }
              >
                <span className="ponto" aria-hidden />
                Cliente aguarda resposta {esperaDesde(p.desde, agora)}
                {contexto.conversaId !== null && (
                  <>
                    {" · "}
                    <Link href={conversaHref(contexto.conversaId)}>responder</Link>
                  </>
                )}
              </p>
            ) : p.tipo === "sem_responsavel" ? (
              <p key={p.tipo} className="faixa-de-estado espera-longa">
                <span className="ponto" aria-hidden />
                Sem responsável
                {podeAtribuir && " · atribua em ···"}
              </p>
            ) : null,
          )}
        </div>
      )}

      <div className="rolavel corpo-do-caso">
        {caso.descricao !== "" && (
          <section className="bloco-do-caso">
            <h2 className="titulo-do-bloco">Resumo</h2>
            <p className="texto-do-caso">{caso.descricao}</p>
          </section>
        )}

        {/* ---- CNJ como DADO quando existe; formulário só quando falta ou
            ao pedir para editar. ---- */}
        <section className="bloco-do-caso">
          <h2 className="titulo-do-bloco">Processo</h2>
          {caso.cnj !== null ? (
            <div className="linha-de-dado">
              <span className="rotulo">Número CNJ</span>
              <span className="valor" style={{ fontVariantNumeric: "tabular-nums" }}>
                {formataCnj(caso.cnj)}
              </span>
              {caso.podeGerenciar && (
                <details className="editar-inline">
                  <summary className="botao discreto compacto">Editar</summary>
                  <form action={definirCnj} className="acoes-em-linha">
                    <input type="hidden" name="caso" value={caso.id} />
                    <input type="hidden" name="voltar" value={voltarPara} />
                    <input
                      type="text"
                      name="cnj"
                      defaultValue={caso.cnj}
                      aria-label="Número CNJ do processo"
                      inputMode="numeric"
                    />
                    <button type="submit" className="secundario compacto">
                      Salvar
                    </button>
                  </form>
                </details>
              )}
            </div>
          ) : (
            <div className="linha-de-dado">
              <span className="rotulo">Número CNJ</span>
              <span className="valor detalhe">
                Sem número de processo. Normal quando o caso ainda não virou
                processo judicial.
              </span>
              {caso.podeGerenciar && (
                <details className="editar-inline">
                  <summary className="botao discreto compacto">Informar</summary>
                  <form action={definirCnj} className="acoes-em-linha">
                    <input type="hidden" name="caso" value={caso.id} />
                    <input type="hidden" name="voltar" value={voltarPara} />
                    <input
                      type="text"
                      name="cnj"
                      placeholder="0000000-00.0000.0.00.0000"
                      aria-label="Número CNJ do processo"
                      inputMode="numeric"
                    />
                    <button type="submit" className="secundario compacto">
                      Salvar
                    </button>
                  </form>
                </details>
              )}
            </div>
          )}
        </section>

        {/* ---- C. LINHA DO TEMPO ÚNICA ---- */}
        <section className="bloco-do-caso">
          <h2 className="titulo-do-bloco">Linha do tempo</h2>
          {historicoForaDoAlcance ? (
            <p className="detalhe historico-fora-do-alcance">
              <Icone nome="info" tamanho={14} />
              O histórico deste caso não está disponível para o seu papel. Você
              pode gerenciar o caso, mas a correspondência entre cliente e
              advogado fica com quem participa dele.
            </p>
          ) : linhaDoTempo.length === 0 ? (
            <p className="detalhe">
              Nenhum evento ainda. Atualizações da equipe e andamentos do
              tribunal aparecem aqui.
            </p>
          ) : (
            <ol className="linha-do-tempo-unica">
              {linhaDoTempo.map((evento, indice) => {
                const anterior = indice > 0 ? linhaDoTempo[indice - 1] : null;
                const dia =
                  evento.quando === null
                    ? null
                    : separadorDeDia(
                        evento.quando,
                        anterior?.quando ?? null,
                        agora,
                      );
                return (
                  <li key={evento.id} className={`evento origem-${evento.origem}`}>
                    {dia !== null && (
                      <div className="separador-de-dia" role="separator">
                        <span>{dia}</span>
                      </div>
                    )}
                    <div className="conteudo-do-evento">
                      <span className="marca-da-origem" aria-hidden />
                      <span className="texto">
                        <span className="cabeca">
                          <span className="titulo">{evento.titulo}</span>
                          <span className="meta">
                            <span className="origem">{evento.rotuloDaOrigem}</span>
                            {evento.quando !== null && (
                              <>
                                <span aria-hidden> · </span>
                                <span title={rotuloDeHorario(evento.quando, agora)}>
                                  {esperaDesde(evento.quando, agora)}
                                </span>
                              </>
                            )}
                          </span>
                        </span>
                        {evento.corpo !== "" && (
                          <span className="corpo">{evento.corpo}</span>
                        )}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        {/* ---- D. DOCUMENTOS (leitura). Só aparece quando há. ---- */}
        {contexto.documentos.length > 0 && (
          <section className="bloco-do-caso">
            <h2 className="titulo-do-bloco">
              Documentos
              <span className="detalhe" style={{ fontWeight: 500 }}>
                {" "}
                {contexto.documentos.length}
              </span>
            </h2>
            <ul className="lista-de-documentos">
              {contexto.documentos.map((doc) => (
                <li key={doc.id}>
                  {doc.url !== null ? (
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noreferrer"
                      className="documento"
                      title="Abrir em nova aba"
                    >
                      <Icone nome="documento" tamanho={18} />
                      <span className="texto">
                        <span className="titulo">{doc.titulo}</span>
                        <span className="meta">
                          {[doc.tamanho, `por ${primeiroNome(doc.quemSubiu)}`, doc.quando ? esperaDesde(doc.quando, agora) : null]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </span>
                      <Icone nome="seta-direita" tamanho={14} className="seta" />
                    </a>
                  ) : (
                    <span className="documento indisponivel">
                      <Icone nome="documento" tamanho={18} />
                      <span className="texto">
                        <span className="titulo">{doc.titulo}</span>
                        <span className="meta">Arquivo indisponível no momento</span>
                      </span>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
