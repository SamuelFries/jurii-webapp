"use client";

import { chipUtil } from "@/lib/busca/texto";

/** O campo de busca das listas: filtro LOCAL, resposta a cada tecla, botão
 * de limpar. Sem debounce de servidor porque nada vai ao servidor. */
export function CampoDeBusca({
  valor,
  aoMudar,
  placeholder,
  rotulo,
}: {
  valor: string;
  aoMudar: (novo: string) => void;
  placeholder: string;
  rotulo: string;
}) {
  return (
    <div className="formulario-de-busca" style={{ marginBottom: 12 }}>
      <input
        type="search"
        value={valor}
        onChange={(evento) => aoMudar(evento.target.value)}
        placeholder={placeholder}
        aria-label={rotulo}
      />
      {valor !== "" && (
        <button
          type="button"
          className="secundario"
          onClick={() => aoMudar("")}
        >
          Limpar
        </button>
      )}
    </div>
  );
}

export interface ChipDeFiltro {
  rotulo: string;
  casa: number;
  ativo: boolean;
  aoAlternar: () => void;
}

/** A fileira de chips: chip só existe quando SEPARA (0 < casa < total), e
 * chip ativo nunca some, senão a pessoa fica presa num filtro sem enxergar
 * o controle que o desfaz. As mesmas regras do app. */
export function FileiraDeChips({
  chips,
  total,
}: {
  chips: ChipDeFiltro[];
  total: number;
}) {
  const visiveis = chips.filter(
    (chip) => chip.ativo || chipUtil(chip.casa, total),
  );
  if (visiveis.length === 0) return null;

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
      {visiveis.map((chip) => (
        <button
          key={chip.rotulo}
          type="button"
          onClick={chip.aoAlternar}
          className={chip.ativo ? "chip-de-filtro ativo" : "chip-de-filtro"}
          aria-pressed={chip.ativo}
        >
          {chip.rotulo} ({chip.casa})
        </button>
      ))}
    </div>
  );
}

/** "A busca não achou" é diferente de "não existe nada": diz quantos
 * continuam ali e oferece o desfazer. */
export function NadaEncontrado({
  mensagem,
  aoLimpar,
}: {
  mensagem: string;
  aoLimpar: () => void;
}) {
  return (
    <div className="vazio">
      <p style={{ margin: "0 0 6px" }}>
        <strong>Nenhum resultado</strong>
      </p>
      <p style={{ margin: 0 }}>{mensagem}</p>
      <button
        type="button"
        className="secundario"
        style={{ width: "auto" }}
        onClick={aoLimpar}
      >
        Limpar busca
      </button>
    </div>
  );
}
