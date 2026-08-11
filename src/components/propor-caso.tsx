import { proporCaso } from "@/app/propor-caso/acoes";
import { areasDoDireito } from "@/lib/dominio/areas";

/**
 * O "Enviar solicitação de caso" do app, na área de trabalho: um painel
 * recolhido no topo do chat profissional. O caso NASCE aqui: o cliente
 * recebe a solicitação em Meus casos e aceita ou recusa lá.
 */
export function ProporCaso({
  conversaId,
  voltar,
}: {
  conversaId: string;
  voltar: string;
}) {
  return (
    <details className="propor-caso">
      <summary>Propor caso</summary>
      <form action={proporCaso} className="cartao" style={{ marginTop: 10 }}>
        <input type="hidden" name="conversa" value={conversaId} />
        <input type="hidden" name="voltar" value={voltar} />

        <label htmlFor="titulo-do-caso">Título do caso</label>
        <input
          id="titulo-do-caso"
          type="text"
          name="titulo"
          required
          placeholder="Ex.: Rescisão indireta da Ana"
        />

        <label htmlFor="area-do-caso">Área</label>
        <select
          id="area-do-caso"
          name="area"
          className="seletor"
          required
          defaultValue=""
        >
          <option value="" disabled>
            Escolha a área
          </option>
          {areasDoDireito.map((area) => (
            <option key={area} value={area}>
              {area}
            </option>
          ))}
        </select>

        <label htmlFor="resumo-do-caso">Resumo (opcional)</label>
        <textarea
          id="resumo-do-caso"
          name="resumo"
          rows={3}
          placeholder="O que será feito, em uma ou duas frases."
        />

        <button type="submit">Enviar solicitação ao cliente</button>
        <p className="detalhe">
          O cliente recebe em Meus casos e decide lá. Nada é cobrado por
          aqui.
        </p>
      </form>
    </details>
  );
}
