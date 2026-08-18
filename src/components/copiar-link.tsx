"use client";

import { useState } from "react";

/**
 * O link de convite, pronto para copiar.
 *
 * É o ÚNICO componente de cliente da feature, e existe por um motivo só:
 * navigator.clipboard. O input readonly ao lado é o fallback honesto — quem
 * estiver num navegador sem clipboard seleciona e copia à mão, e o valor
 * está sempre visível, nunca atrás do botão.
 */
export function CopiarLink({ url }: { url: string }) {
  const [copiado, setCopiado] = useState(false);

  return (
    <div className="copiar-link">
      <input
        type="text"
        readOnly
        value={url}
        aria-label="Link de convite"
        onFocus={(evento) => evento.currentTarget.select()}
      />
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopiado(true);
            setTimeout(() => setCopiado(false), 2500);
          } catch {
            // Sem clipboard (permissão, navegador antigo): o input está aí.
          }
        }}
      >
        {copiado ? "Copiado" : "Copiar"}
      </button>
    </div>
  );
}
