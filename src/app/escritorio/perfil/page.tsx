import { CascaDeTrabalho } from "@/components/casca-de-trabalho";
import { contextoLogado, exigeEscritorio } from "@/lib/contexto";
import { intervaloDaLinha } from "@/lib/dominio/horarios";

import { salvarApresentacao } from "./acoes";
import { EditorDeHorarios } from "./editor-de-horarios";

export const dynamic = "force-dynamic";

/**
 * O perfil público do escritório, editável: apresentação e horário de
 * atendimento, pelas MESMAS RPCs do app. A régua de quem edita é do
 * servidor (sócio e admin); a tela só esconde o que a RPC recusaria.
 */
export default async function PerfilDoEscritorio({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  const { ok, erro } = await searchParams;
  const contexto = await contextoLogado();
  const escritorio = exigeEscritorio(contexto);

  const podeEditar = escritorio.papeis.some((papel) =>
    ["owner", "admin"].includes(papel),
  );

  const [firmaRes, horariosRes] = await Promise.all([
    contexto.supabase
      .from("law_firms")
      .select("description")
      .eq("id", escritorio.id)
      .maybeSingle(),
    contexto.supabase
      .from("law_firm_business_hours")
      .select("weekday, opens_at, closes_at")
      .eq("law_firm_id", escritorio.id)
      .order("weekday")
      .order("opens_at"),
  ]);

  const descricao = String(firmaRes.data?.description ?? "");
  const intervalos = (
    ((horariosRes.data as unknown[]) ?? []) as Record<string, unknown>[]
  )
    .map(intervaloDaLinha)
    .map((intervalo) => ({
      weekday: intervalo.weekday,
      opens_at: intervalo.abre,
      closes_at: intervalo.fecha,
    }));

  return (
    <CascaDeTrabalho
      fluxo="escritorio"
      fluxos={contexto.fluxos}
      caminhoAtivo="/escritorio/perfil"
    >
      <div className="pagina-de-trabalho">
        <div className="miolo" style={{ maxWidth: 720 }}>
          <h1 style={{ marginTop: 0 }}>Perfil do escritório</h1>
          <p className="subtitulo">
            É isto que o cliente vê no perfil público de {escritorio.nome}.
            CNPJ, endereço e dados cadastrais são editados no aplicativo.
          </p>

          {erro !== undefined && <p className="erro">{erro}</p>}
          {ok === "apresentacao" && (
            <p className="aviso-bom">Apresentação salva.</p>
          )}
          {ok === "horarios" && <p className="aviso-bom">Horários salvos.</p>}

          {!podeEditar ? (
            <p className="vazio">
              Apresentação e horários são editados por sócio ou admin do
              escritório.
            </p>
          ) : (
            <>
              <div className="cartao">
                <strong>Apresentação</strong>
                <form action={salvarApresentacao}>
                  <input
                    type="hidden"
                    name="escritorio"
                    value={escritorio.id}
                  />
                  <label htmlFor="descricao">
                    Como o escritório se apresenta ao cliente
                  </label>
                  <textarea
                    id="descricao"
                    name="descricao"
                    rows={6}
                    defaultValue={descricao}
                    placeholder="Ex.: Escritório com 20 anos de atuação em Direito Previdenciário no RS."
                  />
                  <button type="submit">Salvar apresentação</button>
                </form>
              </div>

              <div className="cartao" style={{ marginTop: 14 }}>
                <strong>Horário de atendimento</strong>
                <p className="detalhe" style={{ marginTop: 4 }}>
                  Responde a pergunta que o cliente faz antes de escrever:
                  adianta mandar mensagem agora?
                </p>
                <EditorDeHorarios
                  escritorioId={escritorio.id}
                  iniciais={intervalos}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </CascaDeTrabalho>
  );
}
