import {
  bloquearConversa,
  denunciarConversa,
  desbloquearConversa,
} from "@/app/moderacao/acoes";

const razoes = [
  ["conteudo_abusivo", "Conteúdo abusivo ou ofensivo"],
  ["golpe_ou_fraude", "Golpe ou fraude"],
  ["falsa_identidade", "Perfil falso ou identidade falsa"],
  ["spam", "Spam ou propaganda"],
  ["outro", "Outro"],
] as const;

/**
 * Bloquear, desbloquear e denunciar, no canto do cabeçalho do chat: as
 * MESMAS RPCs e as MESMAS razões do app. Quem está bloqueado por quem é o
 * servidor que diz (fetch_conversation_block_state).
 */
export function ModeracaoDaConversa({
  conversaId,
  voltar,
  bloqueada,
  bloqueadaPorMim,
}: {
  conversaId: string;
  voltar: string;
  bloqueada: boolean;
  bloqueadaPorMim: boolean;
}) {
  return (
    <details className="moderacao">
      <summary aria-label="Mais opções da conversa">⋯</summary>
      <div className="cartao painel-de-moderacao">
        {bloqueadaPorMim ? (
          <form action={desbloquearConversa}>
            <input type="hidden" name="conversa" value={conversaId} />
            <input type="hidden" name="voltar" value={voltar} />
            <button type="submit" className="secundario">
              Desbloquear conversa
            </button>
          </form>
        ) : bloqueada ? (
          <p className="detalhe" style={{ margin: 0 }}>
            A outra pessoa bloqueou esta conversa.
          </p>
        ) : (
          <form action={bloquearConversa}>
            <input type="hidden" name="conversa" value={conversaId} />
            <input type="hidden" name="voltar" value={voltar} />
            <button type="submit" className="secundario">
              Bloquear conversa
            </button>
            <p className="detalhe">
              Bloquear impede novas mensagens dos dois lados até você
              desbloquear.
            </p>
          </form>
        )}

        <form action={denunciarConversa} style={{ marginTop: 10 }}>
          <input type="hidden" name="conversa" value={conversaId} />
          <input type="hidden" name="voltar" value={voltar} />
          <label htmlFor="razao-da-denuncia">Denunciar esta conversa</label>
          <select
            id="razao-da-denuncia"
            name="razao"
            className="seletor"
            defaultValue=""
            required
          >
            <option value="" disabled>
              Escolha o motivo
            </option>
            {razoes.map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </select>
          <textarea
            name="detalhes"
            rows={2}
            placeholder="Detalhes (opcional)"
            style={{ marginTop: 8 }}
          />
          <button type="submit" className="secundario">
            Enviar denúncia
          </button>
        </form>
      </div>
    </details>
  );
}
