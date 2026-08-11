import Link from "next/link";

import { PainelDeMensagens } from "@/components/paineis";
import { contextoLogado, exigeEscritorio } from "@/lib/contexto";
import { conversaParaTela } from "@/lib/busca/mapeia";
import { conversaDaLinha } from "@/lib/dominio/conversas";

export const dynamic = "force-dynamic";

export default async function MensagensDoEscritorio({
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
    <PainelDeMensagens
      fluxo="escritorio"
      fluxos={contexto.fluxos}
      caminhoAtivo="/escritorio/mensagens"
      titulo="Mensagens"
      subtitulo={`Conversas de ${escritorio.nome}.`}
      conversas={conversas}
      baseHref="/escritorio/conversas"
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
            href="/escritorio/mensagens"
            className={segmentoEquipe ? "" : "ativa"}
          >
            Clientes
          </Link>
          <Link
            href="/escritorio/mensagens?aba=equipe"
            className={segmentoEquipe ? "ativa" : ""}
          >
            Equipe
          </Link>
        </nav>
      }
    >
      <div className="painel-vazio">
        <p>
          Escolha uma conversa ao lado. Ela abre aqui do lado, com a lista
          sempre à mão.
        </p>
      </div>
    </PainelDeMensagens>
  );
}
