import { CascaDeTrabalho } from "@/components/casca-de-trabalho";
import { contextoLogado, exigeEscritorio } from "@/lib/contexto";
import { membroDaLinha } from "@/lib/dominio/equipe";
import { rotuloDoPapel } from "@/lib/fluxos";

export const dynamic = "force-dynamic";

export default async function PaginaDaEquipe() {
  const contexto = await contextoLogado();
  const escritorio = exigeEscritorio(contexto);

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
    <CascaDeTrabalho
      fluxo="escritorio"
      fluxos={contexto.fluxos}
      caminhoAtivo="/escritorio/equipe"
    >
      <div className="pagina-de-trabalho"><div className="miolo">
      <h1>Equipe</h1>
      <p className="subtitulo">
        Quem trabalha em {escritorio.nome}. Convites e permissões são feitos
        pelo aplicativo.
      </p>

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
    </CascaDeTrabalho>
  );
}
