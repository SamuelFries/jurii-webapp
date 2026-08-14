import { contextoLogado, exigeEscritorio } from "@/lib/contexto";
import { intervaloDaLinha } from "@/lib/dominio/horarios";

import { areasDoDireito } from "@/lib/dominio/areas";
import { mascaraDeCnpj } from "@/lib/dominio/verificacao";
import { ehGestor } from "@/lib/fluxos";

import { salvarApresentacao, salvarCadastro } from "./acoes";
import { EditorDeHorarios } from "./editor-de-horarios";

export const dynamic = "force-dynamic";

/**
 * O perfil público do escritório, editável: apresentação e horário de
 * atendimento, pelas MESMAS RPCs do app. A régua de quem edita é do
 * servidor (sócio e admin); a tela só esconde o que a RPC recusaria.
 */
export default async function PerfilDoEscritorio({
  params,
  searchParams,
}: {
  params: Promise<{ escritorio: string }>;
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  const { escritorio: escritorioId } = await params;
  const { ok, erro } = await searchParams;
  const contexto = await contextoLogado();
  const escritorio = exigeEscritorio(contexto, escritorioId);

  const podeEditar = ehGestor(escritorio);

  const [firmaRes, horariosRes, cnpjRes] = await Promise.all([
    contexto.supabase
      .from("law_firms")
      // `specialty`, e NAO `primary_area`: essa coluna nao existe em
      // law_firms, e o PostgREST recusa o SELECT INTEIRO quando uma coluna
      // nao existe. O formulario abria VAZIO por causa de uma palavra, que
      // e o mesmo defeito que o app ja teve. A RPC de gravacao continua
      // recebendo primary_area_value, que e o nome do ARGUMENTO dela.
      .select(
        "description, name, phone, email, website_url, address, address_number, address_complement, cep, latitude, longitude, specialty, practice_areas",
      )
      .eq("id", escritorio.id)
      .maybeSingle(),
    contexto.supabase
      .from("law_firm_business_hours")
      .select("weekday, opens_at, closes_at")
      .eq("law_firm_id", escritorio.id)
      .order("weekday")
      .order("opens_at"),
    // O CNPJ não mora em law_firms: fica na verificação aprovada, e a RPC
    // é quem sabe qual delas vale quando houve recusa e reenvio. Ela mesma
    // cobra is_active_law_firm_manager, então secretária e estagiário
    // recebem nulo em vez de o dado da empresa.
    contexto.supabase.rpc("fetch_law_firm_cnpj", {
      law_firm_id_value: escritorio.id,
    }),
  ]);

  const firma = (firmaRes.data ?? {}) as Record<string, unknown>;
  const descricao = String(firma.description ?? "");
  const cnpj = cnpjRes.data == null ? null : String(cnpjRes.data);
  // O formulário abre PREENCHIDO: o defeito equivalente no app era gravar
  // por cima com o que a tela não tinha lido.
  const valor = (campo: string) =>
    firma[campo] == null ? "" : String(firma[campo]);
  const areasAtuais = Array.isArray(firma.practice_areas)
    ? (firma.practice_areas as unknown[]).map(String)
    : [];
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
      <div className="pagina-de-trabalho">
        <div className="miolo" style={{ maxWidth: 720 }}>
          <h1 style={{ marginTop: 0 }}>Perfil do escritório</h1>
          <p className="subtitulo">
            É isto que o cliente vê no perfil público de {escritorio.nome}.
          </p>

          {erro !== undefined && <p className="erro">{erro}</p>}
          {ok === "apresentacao" && (
            <p className="aviso-bom">Apresentação salva.</p>
          )}
          {ok === "horarios" && <p className="aviso-bom">Horários salvos.</p>}
          {ok === "cadastro" && <p className="aviso-bom">Cadastro salvo.</p>}
          {ok === "cadastro-sem-mapa" && (
            <p className="aviso-bom">
              Cadastro salvo. Não conseguimos localizar o CEP no mapa agora,
              então o escritório fica fora da ordenação por distância até a
              próxima gravação.
            </p>
          )}

          {!podeEditar ? (
            <p className="vazio">
              O cadastro, a apresentação e os horários são editados por sócio
              ou admin do escritório.
            </p>
          ) : (
            <>
              <div className="cartao">
                <strong>Dados do escritório</strong>
                <p className="detalhe" style={{ marginTop: 4 }}>
                  O endereço alimenta a ordenação por distância na busca do
                  cliente: manter certo é o que faz o escritório aparecer para
                  quem está perto.
                </p>
                <form action={salvarCadastro}>
                  <input type="hidden" name="escritorio" value={escritorio.id} />
                  {/* O que a tela LEU vai junto: é assim que a regra da
                      coordenada sabe se o CEP ou o número mudaram. */}
                  <input type="hidden" name="cep_antigo" value={valor("cep")} />
                  <input
                    type="hidden"
                    name="numero_antigo"
                    value={valor("address_number")}
                  />
                  <input
                    type="hidden"
                    name="latitude_antiga"
                    value={valor("latitude")}
                  />
                  <input
                    type="hidden"
                    name="longitude_antiga"
                    value={valor("longitude")}
                  />

                  <label htmlFor="nome">Nome do escritório</label>
                  <input
                    id="nome"
                    name="nome"
                    type="text"
                    required
                    defaultValue={valor("name") || escritorio.nome}
                  />

                  {/* TRAVADO, e visível de propósito, como no app: o CNPJ é o
                      dado verificado do escritório, e trocá-lo não é corrigir
                      cadastro, é ser outra empresa. Não ter o campo pareceria
                      esquecimento; mostrar travado explica a regra. */}
                  <label htmlFor="cnpj">CNPJ</label>
                  <input
                    id="cnpj"
                    type="text"
                    readOnly
                    disabled
                    value={cnpj === null ? "" : mascaraDeCnpj(cnpj)}
                    placeholder={cnpj === null ? "Não disponível" : undefined}
                  />
                  <p className="detalhe">
                    Verificado. Para corrigi-lo é preciso uma nova verificação
                    do escritório.
                  </p>

                  <div className="acoes-em-linha">
                    <div style={{ flex: 1 }}>
                      <label htmlFor="telefone">Telefone</label>
                      <input
                        id="telefone"
                        name="telefone"
                        type="text"
                        inputMode="tel"
                        defaultValue={valor("phone")}
                        placeholder="(51) 3333-0000"
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label htmlFor="email">E-mail</label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        defaultValue={valor("email")}
                      />
                    </div>
                  </div>

                  <label htmlFor="site">Site</label>
                  <input
                    id="site"
                    name="site"
                    type="url"
                    defaultValue={valor("website_url")}
                    placeholder="https://"
                  />

                  <div className="acoes-em-linha">
                    <div style={{ flex: "0 0 150px" }}>
                      <label htmlFor="cep">CEP</label>
                      <input
                        id="cep"
                        name="cep"
                        type="text"
                        inputMode="numeric"
                        maxLength={9}
                        defaultValue={valor("cep")}
                        placeholder="90540-140"
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label htmlFor="endereco">
                        Endereço (deixe vazio para buscar pelo CEP)
                      </label>
                      <input
                        id="endereco"
                        name="endereco"
                        type="text"
                        defaultValue={valor("address")}
                      />
                    </div>
                  </div>

                  <div className="acoes-em-linha">
                    <div style={{ flex: "0 0 130px" }}>
                      <label htmlFor="numero">Número</label>
                      <input
                        id="numero"
                        name="numero"
                        type="text"
                        defaultValue={valor("address_number")}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label htmlFor="complemento">Complemento</label>
                      <input
                        id="complemento"
                        name="complemento"
                        type="text"
                        defaultValue={valor("address_complement")}
                        placeholder="Sala 1102"
                      />
                    </div>
                  </div>

                  <label htmlFor="area_principal">Área principal</label>
                  <select
                    id="area_principal"
                    name="area_principal"
                    defaultValue={valor("specialty")}
                  >
                    <option value="">Sem área principal</option>
                    {areasDoDireito.map((area) => (
                      <option key={area} value={area}>
                        {area}
                      </option>
                    ))}
                  </select>

                  <label>Áreas de atuação</label>
                  <div className="grade-de-areas">
                    {areasDoDireito.map((area) => (
                      <label key={area} className="area-marcavel">
                        <input
                          type="checkbox"
                          name="areas"
                          value={area}
                          defaultChecked={areasAtuais.includes(area)}
                        />
                        {area}
                      </label>
                    ))}
                  </div>

                  <button type="submit">Salvar cadastro</button>
                </form>
              </div>

              <div className="cartao" style={{ marginTop: 14 }}>
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
  );
}
