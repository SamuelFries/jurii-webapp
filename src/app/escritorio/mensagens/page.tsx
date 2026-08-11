import Link from "next/link";

import { Casca } from "@/components/casca";
import { ConversasComBusca } from "@/components/listas/conversas-com-busca";
import { contextoLogado, exigeEscritorio } from "@/lib/contexto";
import { conversaParaTela } from "@/lib/busca/mapeia";
import { conversaDaLinha } from "@/lib/dominio/conversas";

export const dynamic = "force-dynamic";

export default async function PaginaDeConversasDoEscritorio({
  searchParams,
}: {
  searchParams: Promise<{ aba?: string }>;
}) {
  const { aba } = await searchParams;
  const contexto = await contextoLogado();
  const escritorio = exigeEscritorio(contexto);
  const segmentoEquipe = aba === "equipe";

  const { data } = await contexto.supabase.rpc(
    "fetch_conversations_for_current_user",
    {
      scope_value: segmentoEquipe ? "firmTeam" : "firmClient",
      law_firm_id_value: escritorio.id,
    },
  );

  const agora = new Date();
  const conversas = ((data as unknown[]) ?? []).map((linha) =>
    conversaParaTela(conversaDaLinha(linha as Record<string, unknown>), agora),
  );

  return (
    <Casca fluxo="escritorio" fluxos={contexto.fluxos} caminhoAtivo="/escritorio/mensagens">
      <h1>Mensagens</h1>
      <p className="subtitulo">
        Conversas de {escritorio.nome} com clientes e equipe.
      </p>

      <nav className="troca-de-fluxo" aria-label="Segmento">
        <Link href="/escritorio/mensagens" className={segmentoEquipe ? "" : "ativa"}>
          Clientes
        </Link>
        <Link
          href="/escritorio/mensagens?aba=equipe"
          className={segmentoEquipe ? "ativa" : ""}
        >
          Equipe
        </Link>
      </nav>
      <div style={{ height: 14 }} />

      <ConversasComBusca
        conversas={conversas}
        baseHref="/escritorio/conversas"
        vazio={
          segmentoEquipe
            ? "Nenhuma conversa interna ainda."
            : "Quando um cliente falar com o escritório, a conversa aparece aqui."
        }
        rotuloNaoLidas="Ninguém abriu"
        placeholder={
          segmentoEquipe
            ? "Buscar por pessoa da equipe"
            : "Buscar por cliente ou advogado"
        }
      />
    </Casca>
  );
}
