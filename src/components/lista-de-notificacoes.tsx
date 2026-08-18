import type { SupabaseClient } from "@supabase/supabase-js";

import { Icone } from "./icone";
import { esperaDesde } from "@/lib/dominio/conversas";

import {
  abrirNotificacao,
  apagarNotificacao,
  marcarComoLida,
  marcarTodasComoLidas,
  responderConviteDeEquipe,
} from "@/app/notificacoes/acoes";
import {
  conviteDeEquipePendente,
  destinoDaNotificacao,
  notificacaoDaLinha,
  type EscopoDeNotificacao,
  nivelDaNotificacao,
  rotuloDoNivel,
} from "@/lib/dominio/notificacoes";
import { rotuloDeHorario } from "@/lib/dominio/conversas";

/**
 * A central de notificações de um fluxo, espelho do painel do sino no app:
 * abrir NÃO marca tudo como lido (o destaque de não lida é o que ajuda a
 * achar o que falta ver); marca-se ao abrir cada uma, ou de uma vez pelo
 * botão do topo.
 */
export async function ListaDeNotificacoes({
  supabase,
  escopo,
  lawFirmId = null,
  fluxo,
  voltar,
}: {
  supabase: SupabaseClient;
  escopo: EscopoDeNotificacao;
  lawFirmId?: string | null;
  fluxo: "advogado" | "escritorio";
  voltar: string;
}) {
  let consulta = supabase
    .from("notifications")
    .select("id, title, body, type, scope, metadata, read_at, created_at")
    .eq("scope", escopo);
  if (escopo === "firm" && lawFirmId !== null) {
    consulta = consulta.eq("law_firm_id", lawFirmId);
  }
  const { data } = await consulta
    .order("created_at", { ascending: false })
    .limit(30);

  const notificacoes = ((data as unknown[]) ?? []).map((linha) =>
    notificacaoDaLinha(linha as Record<string, unknown>),
  );
  const temNaoLida = notificacoes.some((notificacao) => !notificacao.lida);
  const agora = new Date();

  return (
    <>
      <div className="linha-topo">
        <h1>Notificações</h1>
        {temNaoLida && (
          <form action={marcarTodasComoLidas}>
            <input type="hidden" name="escopo" value={escopo} />
            {lawFirmId !== null && (
              <input type="hidden" name="escritorio" value={lawFirmId} />
            )}
            <input type="hidden" name="voltar" value={voltar} />
            <button type="submit" className="discreto">
              Marcar todas como lidas
            </button>
          </form>
        )}
      </div>
      <p className="subtitulo">O que aconteceu enquanto você não olhava.</p>

      {notificacoes.length === 0 ? (
        <p className="vazio">Nenhuma notificação por aqui ainda.</p>
      ) : (
        <div className="lista-empilhada">
          {notificacoes.map((notificacao) => {
            // O id do escritório vai junto porque a rota do fluxo o carrega:
            // é o MESMO que filtra a consulta acima, então o "Abrir" leva
            // para o caso na banca de onde a notificação veio.
            const destino = destinoDaNotificacao(notificacao, fluxo, lawFirmId);
            const convite =
              fluxo === "advogado" && conviteDeEquipePendente(notificacao);
            const nivel = nivelDaNotificacao(notificacao.tipo);
            return (
              <div
                key={notificacao.id}
                className={`cartao-de-lista notificacao nivel-${nivel}${
                  notificacao.lida ? " lida" : ""
                }`}
              >
                {/* O nível vira um fio à esquerda e um ícone: hierarquia
                    sem alarme. Não lida = fio cheio e ponto dourado; lida =
                    tudo no tom neutro. */}
                <span className="icone-do-nivel" aria-hidden>
                  <Icone
                    nome={
                      nivel === "acao"
                        ? "alerta"
                        : nivel === "urgente"
                          ? "relogio"
                          : nivel === "atualizacao"
                            ? "casos"
                            : "info"
                    }
                    tamanho={18}
                  />
                </span>
                <span className="conteudo">
                  <span className="cabecalho-da-notificacao">
                    <span className="titulo">
                      {notificacao.titulo}
                      {!notificacao.lida && (
                        <span className="ponto-nao-lida" aria-label="Não lida" />
                      )}
                    </span>
                    <span className="meta">
                      <span className="nivel">{rotuloDoNivel(nivel)}</span>
                      {notificacao.criadaEm !== null && (
                        <>
                          <span aria-hidden> · </span>
                          <span title={rotuloDeHorario(notificacao.criadaEm, agora)}>
                            {esperaDesde(notificacao.criadaEm, agora)}
                          </span>
                        </>
                      )}
                    </span>
                  </span>
                  {notificacao.corpo !== "" && (
                    <p className="linha-2">{notificacao.corpo}</p>
                  )}
                  <span className="acoes-em-linha acoes-discretas">
                    {convite && (
                      <>
                        <form action={responderConviteDeEquipe}>
                          <input
                            type="hidden"
                            name="membership"
                            value={notificacao.membershipId ?? ""}
                          />
                          <input type="hidden" name="resposta" value="aceitar" />
                          <input type="hidden" name="voltar" value={voltar} />
                          <button type="submit" className="compacto">
                            Aceitar convite
                          </button>
                        </form>
                        <form action={responderConviteDeEquipe}>
                          <input
                            type="hidden"
                            name="membership"
                            value={notificacao.membershipId ?? ""}
                          />
                          <input type="hidden" name="resposta" value="recusar" />
                          <input type="hidden" name="voltar" value={voltar} />
                          <button type="submit" className="secundario compacto">
                            Recusar
                          </button>
                        </form>
                      </>
                    )}
                    {destino !== null && (
                      <form action={abrirNotificacao}>
                        <input type="hidden" name="id" value={notificacao.id} />
                        <input type="hidden" name="destino" value={destino} />
                        <button type="submit" className="secundario compacto">
                          Abrir
                        </button>
                      </form>
                    )}
                    {!notificacao.lida && (
                      <form action={marcarComoLida}>
                        <input type="hidden" name="id" value={notificacao.id} />
                        <input type="hidden" name="voltar" value={voltar} />
                        <button type="submit" className="discreto compacto">
                          Marcar como lida
                        </button>
                      </form>
                    )}
                    <form action={apagarNotificacao}>
                      <input type="hidden" name="id" value={notificacao.id} />
                      <input type="hidden" name="voltar" value={voltar} />
                      <button type="submit" className="discreto compacto">
                        Apagar
                      </button>
                    </form>
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
