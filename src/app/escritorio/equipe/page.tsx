import { contextoLogado, exigeEscritorio } from "@/lib/contexto";

import { convidarAdvogado, salvarPapeis } from "./acoes";
import { membroDaLinha } from "@/lib/dominio/equipe";
import { papeisEmOrdem, rotuloDoPapel } from "@/lib/fluxos";

export const dynamic = "force-dynamic";

export default async function PaginaDaEquipe({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  const { ok, erro } = await searchParams;
  const contexto = await contextoLogado();
  const escritorio = exigeEscritorio(contexto);
  const podeConvidar = escritorio.papeis.some((papel) =>
    ["owner", "admin"].includes(papel),
  );

  // O MESMO select do app (_fetchTeamMemberRows): membros não desativados
  // com o perfil junto. Convites e edição de papéis continuam no app.
  const { data } = await contexto.supabase
    .from("law_firm_members")
    .select(
      "profile_id, lawyer_id, roles, member_role, role, status, profiles(full_name, initials, avatar_url)",
    )
    .eq("law_firm_id", escritorio.id)
    .neq("status", "disabled");

  const membros = ((data as unknown[]) ?? []).map((linha) =>
    membroDaLinha(linha as Record<string, unknown>),
  );
  const ativos = membros.filter((membro) => membro.ativo);
  const pendentes = membros.filter((membro) => membro.convitePendente);

  return (
      <div className="pagina-de-trabalho"><div className="miolo">
      <h1>Equipe</h1>
      <p className="subtitulo">
        Quem trabalha em {escritorio.nome}, e o que cada pessoa pode fazer.
      </p>

      {erro !== undefined && <p className="erro">{erro}</p>}
      {ok === "convite" && (
        <p className="aviso-bom">
          Convite enviado. O advogado decide pelo aplicativo, e aparece em
          Convites pendentes até responder.
        </p>
      )}
      {ok === "papeis" && <p className="aviso-bom">Papéis atualizados.</p>}

      {podeConvidar && (
        <details className="propor-caso">
          <summary>Convidar advogado</summary>
          <form
            action={convidarAdvogado}
            className="cartao"
            style={{ marginTop: 10, maxWidth: 480 }}
          >
            <input type="hidden" name="escritorio" value={escritorio.id} />
            <p className="detalhe" style={{ marginTop: 0 }}>
              Só advogado já verificado na OAB pode ser convidado. A vaga
              conta no plano.
            </p>
            <div className="acoes-em-linha">
              <div style={{ flex: "0 0 110px" }}>
                <label htmlFor="uf-da-oab">UF</label>
                <input
                  id="uf-da-oab"
                  type="text"
                  name="uf"
                  required
                  maxLength={2}
                  placeholder="RS"
                  style={{ textTransform: "uppercase" }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label htmlFor="numero-da-oab">Número da OAB</label>
                <input
                  id="numero-da-oab"
                  type="text"
                  name="oab"
                  required
                  placeholder="123456"
                />
              </div>
            </div>
            <button type="submit">Enviar convite</button>
          </form>
        </details>
      )}

      {ativos.length === 0 ? (
        <p className="vazio">Nenhum integrante ativo ainda.</p>
      ) : (
        <div className="lista-empilhada">
          {ativos.map((membro) => (
            <div key={membro.profileId} className="cartao-de-lista">
              <span className="avatar" aria-hidden>
                {membro.avatarUrl !== null ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={membro.avatarUrl} alt="" />
                ) : (
                  membro.iniciais
                )}
              </span>
              <span className="conteudo">
                <span className="titulo">{membro.nome}</span>
                <p className="linha-2">
                  {membro.papeis.map((papel) => (
                    <span key={papel} className="selo-papel">
                      {rotuloDoPapel(papel)}
                    </span>
                  ))}
                </p>
                {podeConvidar && (
                  <details className="papeis-do-membro">
                    <summary className="detalhe" style={{ cursor: "pointer" }}>
                      Mudar papéis
                    </summary>
                    <form action={salvarPapeis} style={{ marginTop: 8 }}>
                      <input
                        type="hidden"
                        name="escritorio"
                        value={escritorio.id}
                      />
                      <input
                        type="hidden"
                        name="membro"
                        value={membro.profileId}
                      />
                      <div className="grade-de-areas">
                        {papeisEmOrdem.map((papel) => (
                          <label key={papel} className="area-marcavel">
                            <input
                              type="checkbox"
                              name="papeis"
                              value={papel}
                              defaultChecked={membro.papeis.includes(papel)}
                            />
                            {rotuloDoPapel(papel)}
                          </label>
                        ))}
                      </div>
                      <p className="detalhe">
                        Sócio e admin administram a equipe; secretária também
                        atribui casos. Só um sócio concede o papel de sócio, e
                        o escritório precisa manter pelo menos um.
                      </p>
                      <button type="submit" className="secundario">
                        Salvar papéis
                      </button>
                    </form>
                  </details>
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      {pendentes.length > 0 && (
        <>
          <h2 className="secao">Convites pendentes</h2>
          <div className="lista-empilhada">
            {pendentes.map((membro) => (
              <div key={membro.profileId} className="cartao-de-lista">
                <span className="avatar" aria-hidden>
                  {membro.iniciais}
                </span>
                <span className="conteudo">
                  <span className="titulo">{membro.nome}</span>
                  <p className="linha-2">Aguardando aceite</p>
                </span>
              </div>
            ))}
          </div>
        </>
      )}
      </div></div>
  );
}
