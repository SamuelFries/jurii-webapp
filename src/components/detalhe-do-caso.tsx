import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  adicionarAtualizacao,
  atribuirAdvogado,
  definirCnj,
  encerrarCaso,
  reabrirCaso,
} from "@/app/casos/acoes-detalhe";
import {
  atualizacaoDaLinha,
  detalheDoCasoDaLinha,
  formataCnj,
  movimentacaoDaLinha,
} from "@/lib/dominio/caso-detalhe";
import { rotuloDeHorario } from "@/lib/dominio/conversas";
import { membroDaLinha } from "@/lib/dominio/equipe";

/**
 * O detalhe do caso, um só para os três fluxos: quem muda é o servidor.
 * fetch_case_for_current_user devolve as permissões da PESSOA neste caso
 * (can_manage, can_manage_lifecycle) e a tela obedece: cliente lê, advogado
 * registra atualização, gestor do escritório atribui.
 */
export async function DetalheDoCaso({
  supabase,
  casoId,
  voltarPara,
  listaHref,
  erro,
  escritorioId = null,
  podeAtribuir = false,
}: {
  supabase: SupabaseClient;
  casoId: string;
  /** A rota deste detalhe, para as ações voltarem para o fluxo certo. */
  voltarPara: string;
  listaHref: string;
  erro?: string;
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
      <>
        <p className="vazio">
          Este caso não está disponível para você. Ele pode ter sido removido.
        </p>
        <Link className="botao secundario" href={listaHref}>
          Voltar para os casos
        </Link>
      </>
    );
  }

  const caso = detalheDoCasoDaLinha(linhaDoDetalhe as Record<string, unknown>);
  const atualizacoes = ((atualizacoesRes.data as unknown[]) ?? []).map(
    (linha) => atualizacaoDaLinha(linha as Record<string, unknown>),
  );
  const movimentacoes = ((movimentacoesRes.data as unknown[]) ?? []).map(
    (linha) => movimentacaoDaLinha(linha as Record<string, unknown>),
  );

  // A lista de advogados atribuíveis só é consultada para quem PODE atribuir.
  const advogados =
    podeAtribuir && escritorioId !== null
      ? (
          ((
            await supabase
              .from("law_firm_members")
              .select(
                "profile_id, lawyer_id, roles, member_role, role, status, profiles(full_name, initials, avatar_url)",
              )
              .eq("law_firm_id", escritorioId)
              .eq("status", "active")
          ).data as unknown[]) ?? []
        )
          .map((linha) => membroDaLinha(linha as Record<string, unknown>))
          .filter((membro) => membro.papeis.includes("lawyer"))
      : [];

  const agora = new Date();

  return (
    <>
      <div className="cabecalho-do-chat">
        <Link href={listaHref}>← Casos</Link>
        <span className="nome">{caso.titulo}</span>
        <span className="area">
          {caso.cliente} · {caso.area}
        </span>
        <span className={caso.encerrado ? "selo" : "selo dourado"}>
          {caso.statusRotulo}
        </span>
      </div>

      {erro !== undefined && <p className="erro">{erro}</p>}

      {caso.descricao !== "" && (
        <p className="subtitulo" style={{ marginTop: 14 }}>
          {caso.descricao}
        </p>
      )}

      <h2 className="secao">Processo</h2>
      {caso.cnj !== null ? (
        <p className="detalhe">Número CNJ: {formataCnj(caso.cnj)}</p>
      ) : (
        <p className="detalhe">
          Sem número de processo. Normal quando o caso ainda não virou
          processo judicial.
        </p>
      )}
      {caso.podeGerenciar && (
        <form action={definirCnj} className="formulario-de-busca">
          <input type="hidden" name="caso" value={caso.id} />
          <input type="hidden" name="voltar" value={voltarPara} />
          <input
            type="search"
            name="cnj"
            defaultValue={caso.cnj ?? ""}
            placeholder="0000000-00.0000.0.00.0000"
            aria-label="Número CNJ do processo"
          />
          <button type="submit" className="secundario">
            Salvar número
          </button>
        </form>
      )}

      {movimentacoes.length > 0 && (
        <>
          <h2 className="secao">Andamento no tribunal</h2>
          <div className="linha-do-tempo">
            {movimentacoes.map((movimentacao) => (
              <div key={movimentacao.id} className="cartao">
                <div className="linha-topo">
                  <strong>{movimentacao.titulo}</strong>
                  {movimentacao.ocorridaEm !== null && (
                    <span className="detalhe">
                      {rotuloDeHorario(movimentacao.ocorridaEm, agora)}
                    </span>
                  )}
                </div>
                {movimentacao.corpo !== "" && (
                  <p className="detalhe">{movimentacao.corpo}</p>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      <h2 className="secao">Atualizações</h2>
      {atualizacoes.length === 0 ? (
        <p className="vazio">Nenhuma atualização registrada ainda.</p>
      ) : (
        <div className="linha-do-tempo">
          {atualizacoes.map((atualizacao) => (
            <div key={atualizacao.id} className="cartao">
              <div className="linha-topo">
                <strong>{atualizacao.titulo}</strong>
                {atualizacao.criadaEm !== null && (
                  <span className="detalhe">
                    {rotuloDeHorario(atualizacao.criadaEm, agora)}
                  </span>
                )}
              </div>
              {atualizacao.corpo !== "" && (
                <p className="detalhe">{atualizacao.corpo}</p>
              )}
              <p className="detalhe">Por {atualizacao.autor}</p>
            </div>
          ))}
        </div>
      )}

      {caso.podeGerenciar && !caso.encerrado && (
        <div className="cartao" style={{ marginTop: 14 }}>
          <strong>Registrar atualização</strong>
          <form action={adicionarAtualizacao}>
            <input type="hidden" name="caso" value={caso.id} />
            <input type="hidden" name="voltar" value={voltarPara} />
            <label htmlFor="titulo-da-atualizacao">Título</label>
            <input
              id="titulo-da-atualizacao"
              type="search"
              name="titulo"
              required
              placeholder="Ex.: Audiência marcada"
            />
            <label htmlFor="corpo-da-atualizacao">Detalhes (opcional)</label>
            <textarea
              id="corpo-da-atualizacao"
              name="corpo"
              rows={3}
              style={{ width: "100%", resize: "vertical" }}
            />
            <button type="submit">Registrar</button>
          </form>
        </div>
      )}

      {podeAtribuir && escritorioId !== null && !caso.encerrado && (
        <div className="cartao" style={{ marginTop: 14 }}>
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
              <label htmlFor="advogado-responsavel">
                Quem assume este caso
              </label>
              <select
                id="advogado-responsavel"
                name="advogado"
                defaultValue={caso.advogadoId ?? ""}
                className="seletor"
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
              <button type="submit" className="secundario">
                Atribuir
              </button>
            </form>
          )}
        </div>
      )}

      {caso.podeEncerrar && (
        <form
          action={caso.encerrado ? reabrirCaso : encerrarCaso}
          style={{ marginTop: 14 }}
        >
          <input type="hidden" name="caso" value={caso.id} />
          <input type="hidden" name="voltar" value={voltarPara} />
          <button type="submit" className="secundario">
            {caso.encerrado ? "Reabrir caso" : "Encerrar caso"}
          </button>
        </form>
      )}
    </>
  );
}
