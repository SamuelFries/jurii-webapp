import Link from "next/link";

import { alternarFavorito } from "@/app/favoritos/acoes";
import { conversarComAdvogado } from "@/app/inicio/acoes";
import { AvaliacoesDoProfissional } from "@/components/avaliacoes-do-profissional";
import { Casca } from "@/components/casca";
import { contextoLogado } from "@/lib/contexto";
import { advogadoDaLinha } from "@/lib/dominio/descoberta";
import { estrelas } from "@/lib/dominio/avaliacoes";

export const dynamic = "force-dynamic";

/**
 * O perfil público do advogado, via fetch_lawyer_public_profile: a única
 * porta que entrega o NOME por id, porque profiles não é público e a
 * consulta precisa de SECURITY DEFINER. A função existe desde a migration
 * 20260718180000 e é a MESMA que o app usa na tela de caso e no chat, com
 * o argumento lawyer_profile_id_value.
 *
 * Ela não devolve is_featured: o selo de destaque fica fora até existir
 * decisão de mexer numa função compartilhada com o app.
 */
export default async function PaginaDoAdvogado({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { id } = await params;
  const { erro } = await searchParams;
  const contexto = await contextoLogado();
  const voltar = `/profissionais/${id}`;

  const [perfilRes, favoritosRes] = await Promise.all([
    // lawyer_profile_id_value, e nao lawyer_id_value: PostgREST resolve RPC
    // por NOME de argumento, e este e o nome que a funcao tem em produção
    // desde a 20260718180000 (a mesma que o app chama).
    contexto.supabase.rpc("fetch_lawyer_public_profile", {
      lawyer_profile_id_value: id,
    }),
    contexto.supabase.rpc("fetch_favorite_ids"),
  ]);

  const linha = ((perfilRes.data as unknown[]) ?? [])[0] as
    | Record<string, unknown>
    | undefined;

  if (perfilRes.error || linha === undefined) {
    return (
      <Casca fluxo="cliente" fluxos={contexto.fluxos} caminhoAtivo="/inicio">
        <p className="vazio">
          {perfilRes.error
            ? "Não foi possível carregar este perfil agora."
            : "Este advogado não está mais disponível no Jurii."}
        </p>
        <div className="acoes-em-linha" style={{ maxWidth: 420 }}>
          <form action={conversarComAdvogado}>
            <input type="hidden" name="id" value={id} />
            <button type="submit" className="secundario">
              Conversar mesmo assim
            </button>
          </form>
          <Link className="botao secundario" href="/inicio">
            Voltar para o Início
          </Link>
        </div>
      </Casca>
    );
  }

  const advogado = advogadoDaLinha(linha);
  const oab =
    linha.oab_number != null && linha.oab_state != null
      ? `OAB ${String(linha.oab_number)}/${String(linha.oab_state)}`
      : null;
  const favorito = new Set(
    (((favoritosRes.data as unknown[]) ?? []) as Record<string, unknown>[]).map(
      (item) => `${item.target_type}:${item.target_id}`,
    ),
  ).has(`lawyer:${id}`);

  return (
    <Casca fluxo="cliente" fluxos={contexto.fluxos} caminhoAtivo="/inicio">
      <div className="cabecalho-do-chat">
        <Link href="/inicio">← Início</Link>
        <span className="nome">{advogado.nome}</span>
        <span className="area">{advogado.areaPrincipal}</span>
      </div>

      {erro !== undefined && <p className="erro">{erro}</p>}

      <div className="cartao" style={{ marginTop: 16 }}>
        <div className="linha-topo">
          <span className="avatar" aria-hidden>
            {advogado.avatarUrl !== null ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={advogado.avatarUrl} alt="" />
            ) : (
              advogado.iniciais
            )}
          </span>
          <span className="acoes-do-topo">
            <span className="selo dourado">
              {advogado.avaliacoes > 0
                ? `${estrelas(advogado.nota)} ${advogado.nota.toFixed(1)} (${advogado.avaliacoes})`
                : "Sem avaliações ainda"}
            </span>
          </span>
        </div>

        {advogado.bio !== "" && <p style={{ marginBottom: 0 }}>{advogado.bio}</p>}

        <p className="detalhe">
          {advogado.areas.length > 0
            ? advogado.areas.join(" · ")
            : advogado.areaPrincipal}
          {oab !== null ? ` · ${oab}` : ""}
        </p>

        <div className="acoes-em-linha">
          <form action={conversarComAdvogado}>
            <input type="hidden" name="id" value={advogado.id} />
            <button type="submit">Conversar</button>
          </form>
          <form action={alternarFavorito} className="forma-do-coracao">
            <input type="hidden" name="tipo" value="lawyer" />
            <input type="hidden" name="id" value={advogado.id} />
            <input type="hidden" name="voltar" value={voltar} />
            <button
              type="submit"
              className={favorito ? "coracao ativo" : "coracao"}
              aria-label={
                favorito ? "Remover dos favoritos" : "Adicionar aos favoritos"
              }
            >
              {favorito ? "♥" : "♡"}
            </button>
          </form>
        </div>
      </div>

      <AvaliacoesDoProfissional
        supabase={contexto.supabase}
        tipo="lawyer"
        id={id}
        voltar={voltar}
      />
    </Casca>
  );
}
