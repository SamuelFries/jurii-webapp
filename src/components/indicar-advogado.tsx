import { indicarAdvogado } from "@/app/escritorio/conversas/acoes";

/**
 * O formulário de indicação na conversa do escritório com o cliente,
 * espelho do recommend_lawyer_sheet do app: escolhe um advogado ATIVO da
 * equipe, nota opcional, e o servidor transforma em mensagem-cartão. Sem
 * advogado ativo na equipe o bloco nem aparece: botão que só anuncia
 * erro é link morto.
 */
export function IndicarAdvogado({
  conversaId,
  voltar,
  advogados,
}: {
  conversaId: string;
  voltar: string;
  advogados: { id: string; nome: string }[];
}) {
  if (advogados.length === 0) return null;

  return (
    <details className="propor-caso">
      <summary>Indicar advogado ao cliente</summary>
      <form action={indicarAdvogado} className="cartao" style={{ marginTop: 10 }}>
        <input type="hidden" name="conversa" value={conversaId} />
        <input type="hidden" name="voltar" value={voltar} />
        <label htmlFor="advogado-indicado">Quem atende esse assunto</label>
        <select id="advogado-indicado" name="advogado" required>
          {advogados.map((advogado) => (
            <option key={advogado.id} value={advogado.id}>
              {advogado.nome}
            </option>
          ))}
        </select>
        <label htmlFor="nota-da-indicacao">Nota para o cliente (opcional)</label>
        <textarea
          id="nota-da-indicacao"
          name="nota"
          rows={2}
          maxLength={280}
          placeholder="Ex.: A Rita cuida de casos como o seu toda semana."
        />
        <button type="submit">Sugerir ao cliente</button>
      </form>
    </details>
  );
}
