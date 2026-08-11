import type { SupabaseClient } from "@supabase/supabase-js";

import {
  apagarAvaliacao,
  enviarAvaliacao,
} from "@/app/escritorios/[id]/acoes";
import { avaliacaoDaLinha, estrelas } from "@/lib/dominio/avaliacoes";
import { rotuloDeHorario } from "@/lib/dominio/conversas";

/**
 * A seção de avaliações de um profissional (advogado ou escritório), uma
 * só para as duas páginas não divergirem. A elegibilidade é do SERVIDOR
 * (fetch_review_eligibility): só quem teve atendimento vê o formulário, e
 * a RPC recusa de qualquer jeito se a tela errar.
 */
export async function AvaliacoesDoProfissional({
  supabase,
  tipo,
  id,
  voltar,
}: {
  supabase: SupabaseClient;
  tipo: "lawyer" | "law_firm";
  id: string;
  voltar: string;
}) {
  const [avaliacoesRes, elegibilidadeRes] = await Promise.all([
    supabase.rpc("fetch_professional_reviews", {
      target_type_value: tipo,
      target_id_value: id,
      limit_value: 20,
    }),
    supabase.rpc("fetch_review_eligibility", {
      target_type_value: tipo,
      target_id_value: id,
    }),
  ]);

  const avaliacoes = (((avaliacoesRes.data as unknown[]) ?? []) as Record<
    string,
    unknown
  >[]).map(avaliacaoDaLinha);
  const elegibilidade = ((elegibilidadeRes.data as unknown[]) ?? [])[0] as
    | Record<string, unknown>
    | undefined;
  const podeAvaliar = elegibilidade?.can_review === true;
  const minhaNota =
    elegibilidade?.my_rating == null ? null : Number(elegibilidade.my_rating);
  const agora = new Date();

  return (
    <>
      <h2 className="secao">Avaliações</h2>
      {podeAvaliar && (
        <div className="cartao">
          <strong>
            {minhaNota === null ? "Avalie o atendimento" : "Atualize sua avaliação"}
          </strong>
          <form action={enviarAvaliacao}>
            <input type="hidden" name="tipo" value={tipo} />
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="voltar" value={voltar} />
            <label htmlFor="nota">Nota</label>
            <select
              id="nota"
              name="nota"
              className="seletor"
              defaultValue={minhaNota === null ? "" : String(minhaNota)}
              required
            >
              <option value="" disabled>
                Escolha de 1 a 5
              </option>
              {[5, 4, 3, 2, 1].map((valor) => (
                <option key={valor} value={valor}>
                  {estrelas(valor)} ({valor})
                </option>
              ))}
            </select>
            <label htmlFor="comentario">Comentário (opcional)</label>
            <textarea id="comentario" name="comentario" rows={3} />
            <button type="submit">Enviar avaliação</button>
          </form>
        </div>
      )}

      {avaliacoes.length === 0 ? (
        <p className="vazio">Nenhuma avaliação ainda.</p>
      ) : (
        <div className="lista-empilhada">
          {avaliacoes.map((avaliacao) => (
            <div key={avaliacao.id} className="cartao-de-lista">
              <span className="avatar" aria-hidden>
                {avaliacao.iniciais}
              </span>
              <span className="conteudo">
                <span className="titulo">
                  {avaliacao.autor}
                  {avaliacao.minha && <span className="selo">Sua avaliação</span>}
                </span>
                <p className="linha-2">
                  {estrelas(avaliacao.nota)}
                  {avaliacao.criadaEm !== null
                    ? ` · ${rotuloDeHorario(avaliacao.criadaEm, agora)}`
                    : ""}
                </p>
                {avaliacao.comentario !== "" && (
                  <p className="linha-2">{avaliacao.comentario}</p>
                )}
                {avaliacao.minha && (
                  <form action={apagarAvaliacao}>
                    <input type="hidden" name="tipo" value={tipo} />
                    <input type="hidden" name="id" value={id} />
                    <input type="hidden" name="voltar" value={voltar} />
                    <button type="submit" className="discreto">
                      Apagar minha avaliação
                    </button>
                  </form>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
