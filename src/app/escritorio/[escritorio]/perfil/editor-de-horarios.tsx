"use client";

import { useState } from "react";

import { salvarHorarios } from "./acoes";

interface Intervalo {
  weekday: number;
  opens_at: string;
  closes_at: string;
}

const dias = [
  { numero: 1, nome: "Segunda" },
  { numero: 2, nome: "Terça" },
  { numero: 3, nome: "Quarta" },
  { numero: 4, nome: "Quinta" },
  { numero: 5, nome: "Sexta" },
  { numero: 6, nome: "Sábado" },
  { numero: 7, nome: "Domingo" },
];

/**
 * O editor de horário de atendimento, o mesmo modelo do app: uma linha por
 * intervalo, weekday 1..7 (1 = segunda), e o conjunto INTEIRO é gravado
 * numa tacada pela RPC. Responde a pergunta que o cliente faz antes de
 * escrever: "adianta mandar mensagem agora?".
 */
export function EditorDeHorarios({
  escritorioId,
  iniciais,
}: {
  escritorioId: string;
  iniciais: Intervalo[];
}) {
  const [intervalos, setIntervalos] = useState<Intervalo[]>(iniciais);

  function adiciona(weekday: number) {
    setIntervalos((atuais) => [
      ...atuais,
      { weekday, opens_at: "09:00", closes_at: "18:00" },
    ]);
  }

  function remove(indice: number) {
    setIntervalos((atuais) => atuais.filter((_, i) => i !== indice));
  }

  function muda(indice: number, campo: "opens_at" | "closes_at", valor: string) {
    setIntervalos((atuais) =>
      atuais.map((intervalo, i) =>
        i === indice ? { ...intervalo, [campo]: valor } : intervalo,
      ),
    );
  }

  return (
    <form action={salvarHorarios}>
      <input type="hidden" name="escritorio" value={escritorioId} />
      <input type="hidden" name="horarios" value={JSON.stringify(intervalos)} />

      {dias.map((dia) => {
        const doDia = intervalos
          .map((intervalo, indice) => ({ intervalo, indice }))
          .filter(({ intervalo }) => intervalo.weekday === dia.numero);
        return (
          <div key={dia.numero} className="dia-de-atendimento">
            <div className="linha-topo">
              <strong>{dia.nome}</strong>
              <button
                type="button"
                className="discreto"
                onClick={() => adiciona(dia.numero)}
              >
                + intervalo
              </button>
            </div>
            {doDia.length === 0 ? (
              <p className="detalhe" style={{ margin: "2px 0 8px" }}>
                Sem atendimento.
              </p>
            ) : (
              doDia.map(({ intervalo, indice }) => (
                <div key={indice} className="intervalo-de-atendimento">
                  <input
                    type="time"
                    value={intervalo.opens_at}
                    aria-label={`${dia.nome}, abre às`}
                    onChange={(evento) =>
                      muda(indice, "opens_at", evento.target.value)
                    }
                  />
                  <span>às</span>
                  <input
                    type="time"
                    value={intervalo.closes_at}
                    aria-label={`${dia.nome}, fecha às`}
                    onChange={(evento) =>
                      muda(indice, "closes_at", evento.target.value)
                    }
                  />
                  <button
                    type="button"
                    className="discreto"
                    onClick={() => remove(indice)}
                  >
                    Remover
                  </button>
                </div>
              ))
            )}
          </div>
        );
      })}

      <button type="submit">Salvar horários</button>
    </form>
  );
}
