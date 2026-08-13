import Link from "next/link";
import { redirect } from "next/navigation";

import { FilaDeRevisao } from "@/components/fila-de-revisao";
import { contextoLogado } from "@/lib/contexto";
import { destinoInicial } from "@/lib/fluxos";
import {
  diasDeEspera,
  type DocumentoParaRevisar,
  type FichaParaRevisar,
} from "@/lib/dominio/revisao";

export const dynamic = "force-dynamic";

/**
 * O painel da equipe da Jurii.
 *
 * MORA NO app.jurii.com.br DE PROPÓSITO, e não num subdomínio próprio: a
 * tela NÃO TEM PODER. Ela chama review_*_verification com a sessão da
 * própria pessoa, e quem confere se ela é da equipe é o banco (jurii_staff,
 * com RLS sem policy). Separar o endereço isolaria só o frontend, que aqui
 * não guarda nada que valha isolar.
 *
 * A PÁGINA NÃO TOCA NO STORAGE: ela lista quem espera. Documento só é
 * assinado e baixado quando a ficha abre, porque baixar os documentos de
 * toda a fila era o que fazia o painel demorar.
 */
export default async function PainelDeRevisao({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  const { ok, erro } = await searchParams;
  const contexto = await contextoLogado();
  if (!contexto.fluxos.equipeJurii) redirect(destinoInicial(contexto.fluxos));

  const { data, error } = await contexto.supabase.rpc(
    "fetch_pending_verifications",
  );
  const linhas = ((data as unknown[]) ?? []) as Record<string, unknown>[];

  // A PÁGINA NÃO ASSINA NADA. Antes, ela criava uma URL por documento de
  // toda a fila antes de a primeira decisão ser possível, e a validade
  // começava a correr aí. Agora a assinatura acontece quando a ficha abre.
  const agora = new Date();
  const fichas: FichaParaRevisar[] = linhas.map((linha) => ({
    id: String(linha.id),
    tipo: linha.kind === "law_firm" ? "law_firm" : "lawyer",
    titulo: String(linha.title ?? ""),
    detalhe: String(linha.detail ?? ""),
    pessoa: String(linha.person_name ?? "Sem nome"),
    email: linha.person_email == null ? null : String(linha.person_email),
    enviadaEmIso:
      linha.submitted_at == null ? null : String(linha.submitted_at),
    documentos: (linha.documents ?? []) as DocumentoParaRevisar[],
  }));

  // Quantas já passaram de dois dias: é o número que diz se a fila está
  // saudável ou atrasada, e ele fica no subtítulo em vez de exigir contar.
  const atrasadas = fichas.filter((ficha) => {
    const dias = diasDeEspera(ficha.enviadaEmIso, agora);
    return dias !== null && dias >= 2;
  }).length;

  return (
    <main className="pagina painel-de-revisao">
      <div className="linha-topo">
        <h1 style={{ margin: 0 }}>Verificações pendentes</h1>
        <Link
          className="botao secundario compacto"
          href={destinoInicial(contexto.fluxos)}
        >
          Sair da revisão
        </Link>
      </div>
      <p className="subtitulo">
        {fichas.length === 0
          ? "Nada esperando decisão agora."
          : `${fichas.length === 1 ? "1 pessoa esperando" : `${fichas.length} pessoas esperando`}${atrasadas > 0 ? `, ${atrasadas} há mais de dois dias` : ""}. Abra uma para ver os documentos.`}
      </p>

      {erro !== undefined && <p className="erro">{erro}</p>}
      {ok === "aprovada" && <p className="aviso-bom">Verificação aprovada.</p>}
      {ok === "recusada" && (
        <p className="aviso-bom">Verificação recusada, com o motivo enviado.</p>
      )}
      {error && <p className="erro">Não foi possível carregar a fila agora.</p>}

      <FilaDeRevisao fichas={fichas} agoraIso={agora.toISOString()} />
    </main>
  );
}
