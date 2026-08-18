import Link from "next/link";

import { PainelDeMensagens } from "@/components/paineis";
import { ResumoDaCaixa } from "@/components/resumo-da-caixa";
import { contextoLogado, exigeEscritorio } from "@/lib/contexto";
import { conversaParaTela } from "@/lib/busca/mapeia";
import { conversaDaLinha } from "@/lib/dominio/conversas";

export const dynamic = "force-dynamic";

export default async function MensagensDoEscritorio({
  params,
  searchParams,
}: {
  params: Promise<{ escritorio: string }>;
  searchParams: Promise<{ aba?: string }>;
}) {
  const { escritorio: escritorioId } = await params;
  const { aba } = await searchParams;
  const contexto = await contextoLogado();
  const escritorio = exigeEscritorio(contexto, escritorioId);
  const segmentoEquipe = aba === "equipe";

  const { data } = await contexto.supabase.rpc(
    "fetch_conversations_for_current_user",
    {
      scope_value: segmentoEquipe ? "firmTeam" : "firmClient",
      law_firm_id_value: escritorio.id,
    },
  );

  const agora = new Date();
  const conversasDoDominio = ((data as unknown[]) ?? []).map((linha) =>
    conversaDaLinha(linha as Record<string, unknown>),
  );
  const conversas = conversasDoDominio.map((conversa) =>
    conversaParaTela(conversa, agora),
  );

  return (
    <PainelDeMensagens
      titulo="Mensagens"
      subtitulo={`Conversas de ${escritorio.nome}.`}
      conversas={conversas}
      baseHref={`/escritorio/${escritorioId}/conversas`}
      vazio={
        segmentoEquipe
          ? "Nenhuma conversa interna ainda."
          : "Quando um cliente falar com o escritório, a conversa aparece aqui."
      }
      placeholder={
        segmentoEquipe
          ? "Buscar por pessoa da equipe"
          : "Buscar por cliente ou advogado"
      }
      rotuloNaoLidas="Ninguém abriu"
      hrefSufixo={segmentoEquipe ? "?aba=equipe" : ""}
      cabecalhoDaLista={
        <nav
          className="troca-de-fluxo"
          aria-label="Segmento"
          style={{ marginBottom: 12 }}
        >
          <Link
            href={`/escritorio/${escritorioId}/mensagens`}
            className={segmentoEquipe ? "" : "ativa"}
          >
            Clientes
          </Link>
          <Link
            href={`/escritorio/${escritorioId}/mensagens?aba=equipe`}
            className={segmentoEquipe ? "ativa" : ""}
          >
            Equipe
          </Link>
        </nav>
      }
    >
      <ResumoDaCaixa
        conversas={conversasDoDominio}
        baseHref={`/escritorio/${escritorioId}/conversas`}
        hrefSufixo={segmentoEquipe ? "?aba=equipe" : ""}
        agora={agora}
      />
    </PainelDeMensagens>
  );
}
