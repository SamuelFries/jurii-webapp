import { Casca } from "@/components/casca";
import { CasosDoClienteComBusca } from "@/components/listas/casos-do-cliente-com-busca";
import { contextoLogado } from "@/lib/contexto";
import {
  casoDoClienteParaTela,
  solicitacaoParaTela,
} from "@/lib/busca/mapeia";
import {
  casoDoClienteDaLinha,
  solicitacaoDaLinha,
} from "@/lib/dominio/casos";

export const dynamic = "force-dynamic";

export default async function PaginaDeCasosDoCliente({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  const contexto = await contextoLogado();

  const [casos, solicitacoes] = await Promise.all([
    contexto.supabase.rpc("fetch_client_cases"),
    contexto.supabase.rpc("fetch_case_requests_for_client"),
  ]);

  const listaDeCasos = ((casos.data as unknown[]) ?? []).map((linha) =>
    casoDoClienteParaTela(casoDoClienteDaLinha(linha as Record<string, unknown>)),
  );
  const listaDeSolicitacoes = ((solicitacoes.data as unknown[]) ?? []).map(
    (linha) =>
      solicitacaoParaTela(solicitacaoDaLinha(linha as Record<string, unknown>)),
  );

  return (
    <Casca fluxo="cliente" fluxos={contexto.fluxos} caminhoAtivo="/casos">
      <h1>Meus casos</h1>
      <p className="subtitulo">Acompanhe aqui seus atendimentos jurídicos.</p>

      {erro !== undefined && <p className="erro">{erro}</p>}

      <CasosDoClienteComBusca
        casos={listaDeCasos}
        solicitacoes={listaDeSolicitacoes}
      />
    </Casca>
  );
}
