import Link from "next/link";

import { contextoLogado, exigeEscritorio } from "@/lib/contexto";

import { convidarAdvogado, salvarPapeis } from "./acoes";
import { membroDaLinha } from "@/lib/dominio/equipe";
import { ehGestor, papeisEmOrdem, rotuloDoPapel } from "@/lib/fluxos";
import { assinaturaDaLinha, bancaPodeCrescer } from "@/lib/licenca";

export const dynamic = "force-dynamic";

export default async function PaginaDaEquipe({
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
  const podeConvidar = ehGestor(escritorio);

  // O MESMO select do app (_fetchTeamMemberRows): membros não desativados
  // com o perfil junto. Convite e edição de papéis vivem em acoes.ts, aqui
  // do lado: o comentário dizia que continuavam no app, e não continuam.
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

  // A COBRANÇA DA BANCA, para a tela poder dizer ANTES em vez de recusar
  // DEPOIS. Com a assinatura parada o servidor recusa convite e promoção, e
  // até esta consulta a pessoa só descobria isso preenchendo a OAB e levando
  // um "não" no fim. Oferecer um formulário que vai certamente falhar é o
  // link morto de sempre, vestido de outra roupa.
  //
  // TODAS as linhas, inclusive canceladas: é a diferença entre "nunca teve
  // licença" (banca anterior ao licenciamento, que segue sem teto) e "teve e
  // acabou" que decide, e filtrar cancelada aqui apagaria essa diferença.
  const { data: linhasDeCobranca } = await contexto.supabase
    .from("law_firm_license_subscriptions")
    .select("*, law_firm_license_plans(*)")
    .eq("law_firm_id", escritorio.id);

  const assinaturas = ((linhasDeCobranca as unknown[]) ?? []).map((linha) =>
    assinaturaDaLinha(linha as Record<string, unknown>),
  );
  const podeCrescer = bancaPodeCrescer(assinaturas, new Date());

  return (
      <div className="pagina-de-trabalho"><div className="miolo">
      <h1>Equipe</h1>
      <p className="subtitulo">
        Quem trabalha em {escritorio.nome}, e o que cada pessoa pode fazer.
      </p>

      {erro !== undefined && <p className="erro">{erro}</p>}
      {ok === "convite" && (
        <p className="aviso-bom">
          Convite enviado. O advogado responde em Notificações, aqui ou no
          aplicativo, e aparece em Convites pendentes até decidir.
        </p>
      )}
      {ok === "papeis" && <p className="aviso-bom">Papéis atualizados.</p>}

      {/* A EQUIPE QUE JÁ EXISTE NÃO MUDA. O aviso fala de crescer, e só, para
          ninguém ler "assinatura pendente" como "perdi o escritório". Quem
          está dentro continua trabalhando normalmente, que é a decisão da
          20260906120000. */}
      {podeConvidar && !podeCrescer && (
        <div className="cartao" style={{ marginBottom: 16 }}>
          <span className="selo">Assinatura pendente</span>
          <p className="detalhe" style={{ marginTop: 10 }}>
            Enquanto o pagamento não entra, o escritório não inclui advogados
            novos, nem por convite nem promovendo quem já está aqui. Quem já
            faz parte da equipe continua trabalhando normalmente.
          </p>
          <Link className="botao" href={`/escritorio/${escritorio.id}/assinatura`}>
            Regularizar pagamento
          </Link>
        </div>
      )}

      {podeConvidar && podeCrescer && (
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
