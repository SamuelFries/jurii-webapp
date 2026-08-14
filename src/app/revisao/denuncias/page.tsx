import Link from "next/link";
import { redirect } from "next/navigation";

import { FilaDeDenuncias } from "@/components/fila-de-denuncias";
import { contextoLogado } from "@/lib/contexto";
import { denunciaDaLinha } from "@/lib/dominio/denuncias";
import { destinoInicial } from "@/lib/fluxos";

export const dynamic = "force-dynamic";

/**
 * As denúncias abertas.
 *
 * ELAS NÃO IAM A LUGAR NENHUM até agora: `user_reports` tem RLS sem policy e
 * revoke de authenticated, e o painel que o comentário da migration prometia
 * nunca existiu. Quem denunciava via a tela dizer que estava registrado, e
 * estava mesmo, numa tabela que ninguém abria.
 *
 * A ficha traz a FOTOGRAFIA da conversa: as 15 últimas mensagens como
 * estavam quando a denúncia foi feita. Não é uma janela para a conversa, que
 * continuaria crescendo, e não some quando o denunciado apaga a mensagem.
 */
export default async function DenunciasAbertas({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  const { ok, erro } = await searchParams;
  const contexto = await contextoLogado();
  if (!contexto.fluxos.equipeJurii) redirect(destinoInicial(contexto.fluxos));

  const { data, error } = await contexto.supabase.rpc("fetch_open_reports");
  const denuncias = (((data as unknown[]) ?? []) as Record<string, unknown>[])
    .map(denunciaDaLinha);

  return (
    <div className="pagina-de-trabalho">
      <div className="miolo painel-de-revisao">
        <div className="linha-topo">
          <h1 style={{ marginTop: 0 }}>Denúncias</h1>
          <Link className="botao secundario compacto" href="/revisao/denuncias/decididas">
            Ver decididas
          </Link>
        </div>
        <p className="subtitulo">
          {error
            ? "Conversas denunciadas por quem participa delas."
            : denuncias.length === 0
              ? "Nenhuma denúncia esperando decisão."
              : `${denuncias.length === 1 ? "1 denúncia esperando" : `${denuncias.length} denúncias esperando`}. A mais antiga primeiro.`}
        </p>

        {erro !== undefined && <p className="erro">{erro}</p>}
        {ok === "decidida" && <p className="aviso-bom">Decisão registrada.</p>}

        {error ? (
          <p className="erro">
            Não foi possível carregar as denúncias agora. Recarregue a página
            em alguns instantes.
          </p>
        ) : (
          <FilaDeDenuncias denuncias={denuncias} decidiveis />
        )}
      </div>
    </div>
  );
}
