import { Casca } from "@/components/casca";
import { CasosDoAdvogadoComBusca } from "@/components/listas/casos-do-advogado-com-busca";
import { contextoLogado, exigeAdvogado } from "@/lib/contexto";
import { casoDoAdvogadoParaTela } from "@/lib/busca/mapeia";
import { casoDoAdvogadoDaLinha } from "@/lib/dominio/casos";

export const dynamic = "force-dynamic";

export default async function PaginaDeCasosDoAdvogado() {
  const contexto = await contextoLogado();
  exigeAdvogado(contexto);

  const { data } = await contexto.supabase.rpc("fetch_lawyer_cases");
  const casos = ((data as unknown[]) ?? []).map((linha) =>
    casoDoAdvogadoParaTela(casoDoAdvogadoDaLinha(linha as Record<string, unknown>)),
  );

  return (
    <Casca
      fluxo="advogado"
      fluxos={contexto.fluxos}
      caminhoAtivo="/advogado/casos"
    >
      <h1>Casos</h1>
      <p className="subtitulo">
        O caso nasce na conversa: proponha pelo chat e o cliente aceita.
      </p>
      <CasosDoAdvogadoComBusca casos={casos} />
    </Casca>
  );
}
