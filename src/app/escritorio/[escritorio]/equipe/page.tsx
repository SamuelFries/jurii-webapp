import Link from "next/link";

import { contextoLogado, exigeEscritorio } from "@/lib/contexto";

import {
  convidarAdvogado,
  gerarLinkDeConvite,
  revogarLinkDeConvite,
  salvarPapeis,
} from "./acoes";
import { membroDaLinha } from "@/lib/dominio/equipe";
import { headers } from "next/headers";

import { CopiarLink } from "@/components/copiar-link";
import { ehGestor, papeisEmOrdem, rotuloDoPapel } from "@/lib/fluxos";

export const dynamic = "force-dynamic";

export default async function PaginaDaEquipe({
  params,
  searchParams,
}: {
  params: Promise<{ escritorio: string }>;
  searchParams: Promise<{
    ok?: string;
    erro?: string;
    link?: string;
    papel?: string;
  }>;
}) {
  const { escritorio: escritorioId } = await params;
  const { ok, erro, link, papel } = await searchParams;
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
  // sem esta pergunta a pessoa só descobria isso preenchendo a OAB e levando
  // um "não" no fim. Oferecer um formulário que vai certamente falhar é o
  // link morto de sempre, vestido de outra roupa.
  //
  // A PERGUNTA VAI PARA O BANCO. Ela já foi respondida aqui, em TypeScript,
  // espelhando teto_de_advogados, e o espelho era exatamente o risco: a regra
  // tem três respostas que dependem de enxergar as assinaturas CANCELADAS, e
  // confundir "nunca teve licença" com "teve e acabou" foi o furo que fazia
  // cancelar virar equipe ilimitada. Uma cópia em cada linguagem é uma cópia
  // que ninguém obriga a mudar junto. Ver a 20260909120000.
  //
  // Otimista quando falha: quem recusa de verdade é o servidor, e sumir com o
  // convite por causa de um erro de rede seria a tela mentindo sobre a
  // assinatura de quem está em dia.
  const { data: podeCrescerBruto } = await contexto.supabase.rpc(
    "banca_pode_crescer",
    { law_firm_id_value: escritorio.id },
  );
  const podeCrescer = podeCrescerBruto !== false;

  // Os links de convite em aberto (a listagem nunca traz token: ele não
  // existe mais, só o hash). E o link recém-gerado, quando há, vira URL
  // completa com o host REAL da requisição — em produção app.jurii.com.br,
  // no ambiente local o localhost, sem hardcode.
  const { data: linksBrutos } = podeConvidar
    ? await contexto.supabase.rpc("listar_links_de_convite", {
        law_firm_id_value: escritorio.id,
      })
    : { data: null };
  const linksAbertos = ((linksBrutos as unknown[]) ?? []) as {
    id: string;
    member_role: string;
    expires_at: string;
    criado_por: string;
  }[];

  let linkGerado: string | null = null;
  if (link !== undefined && link !== "") {
    const cabecalhos = await headers();
    const host =
      cabecalhos.get("x-forwarded-host") ?? cabecalhos.get("host") ?? "";
    const protocolo = host.startsWith("localhost") ? "http" : "https";
    linkGerado = `${protocolo}://${host}/convite/${link}`;
  }

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

      {/* O link de uso único recém-gerado, mostrado UMA vez: o banco guarda
          só o hash, então ou se copia agora ou se gera outro. */}
      {podeConvidar && linkGerado !== null && (
        <div className="cartao" style={{ marginBottom: 16 }}>
          <span className="selo dourado">Link gerado</span>
          <p className="detalhe" style={{ marginTop: 10 }}>
            Convite de{" "}
            <strong>{papel === "intern" ? "estagiário" : "secretária"}</strong>
            , de uso único, válido por 7 dias. Copie e mande para a pessoa —
            este link não aparece de novo.
          </p>
          <CopiarLink url={linkGerado} />
        </div>
      )}

      {podeConvidar && podeCrescer && (
        <details className="propor-caso">
          <summary>Convidar por link (secretária ou estagiário)</summary>
          <div className="cartao" style={{ marginTop: 10, maxWidth: 480 }}>
            <p className="detalhe" style={{ marginTop: 0 }}>
              Para quem não tem OAB. O link entra UMA pessoa, vale 7 dias, e
              você escolhe o papel agora; promover depois é na própria
              equipe.
            </p>
            <form action={gerarLinkDeConvite} className="acoes-em-linha">
              <input type="hidden" name="escritorio" value={escritorio.id} />
              <select name="papel" aria-label="Papel de quem entra">
                <option value="secretary">Secretária</option>
                <option value="intern">Estagiário</option>
              </select>
              <button type="submit">Gerar link</button>
            </form>

            {linksAbertos.length > 0 && (
              <>
                <p className="detalhe" style={{ marginBottom: 6 }}>
                  Links em aberto:
                </p>
                {linksAbertos.map((aberto) => (
                  <form
                    key={aberto.id}
                    action={revogarLinkDeConvite}
                    className="linha-de-link-aberto"
                  >
                    <input
                      type="hidden"
                      name="escritorio"
                      value={escritorio.id}
                    />
                    <input type="hidden" name="link" value={aberto.id} />
                    <span>
                      {aberto.member_role === "intern"
                        ? "Estagiário"
                        : "Secretária"}{" "}
                      · por {aberto.criado_por} · vence{" "}
                      {new Date(aberto.expires_at).toLocaleDateString("pt-BR")}
                    </span>
                    <button type="submit" className="botao secundario">
                      Cancelar
                    </button>
                  </form>
                ))}
              </>
            )}
          </div>
        </details>
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
