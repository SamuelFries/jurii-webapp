import Link from "next/link";

import { PainelDeMensagens } from "@/components/paineis";
import { contextoLogado, exigeAdvogado } from "@/lib/contexto";
import { conversaParaTela } from "@/lib/busca/mapeia";
import { conversaDaLinha } from "@/lib/dominio/conversas";
import { casoDoAdvogadoDaLinha } from "@/lib/dominio/casos";

export const dynamic = "force-dynamic";

/**
 * A mesa de trabalho do advogado: a lista de conversas à esquerda e, sem
 * conversa aberta, o painel Hoje à direita: o que está esperando resposta
 * e o que mexeu nos casos. É a primeira tela do dia.
 */
export default async function MesaDoAdvogado() {
  const contexto = await contextoLogado();
  exigeAdvogado(contexto);

  const [conversasRes, casosRes] = await Promise.all([
    contexto.supabase.rpc("fetch_conversations_for_current_user", {
      scope_value: "lawyer",
      law_firm_id_value: null,
    }),
    contexto.supabase.rpc("fetch_lawyer_cases"),
  ]);

  const agora = new Date();
  const conversas = ((conversasRes.data as unknown[]) ?? []).map((linha) =>
    conversaParaTela(conversaDaLinha(linha as Record<string, unknown>), agora),
  );
  const casos = ((casosRes.data as unknown[]) ?? []).map((linha) =>
    casoDoAdvogadoDaLinha(linha as Record<string, unknown>),
  );

  const naoLidas = conversas.filter((conversa) => conversa.naoLidas > 0);
  const comNovaMensagem = casos.filter(
    (caso) => caso.status === "new_message",
  );

  return (
    <PainelDeMensagens
      fluxo="advogado"
      fluxos={contexto.fluxos}
      caminhoAtivo="/advogado"
      titulo="Mensagens"
      subtitulo="Converse com clientes e acompanhe contatos."
      conversas={conversas}
      baseHref="/advogado/conversas"
      vazio="Quando um cliente falar com você, a conversa aparece aqui."
      placeholder="Buscar por cliente ou área"
    >
      <div className="rolavel" style={{ paddingTop: 24 }}>
        <h1>Hoje</h1>
        <p className="subtitulo">O que está esperando por você.</p>

        <div className="metricas" style={{ maxWidth: 560 }}>
          <div className="metrica">
            <div className="numero">{naoLidas.length}</div>
            <div className="rotulo">
              {naoLidas.length === 1
                ? "conversa não lida"
                : "conversas não lidas"}
            </div>
          </div>
          <div className="metrica">
            <div className="numero">{comNovaMensagem.length}</div>
            <div className="rotulo">
              {comNovaMensagem.length === 1
                ? "caso com mensagem nova"
                : "casos com mensagem nova"}
            </div>
          </div>
        </div>

        {naoLidas.length > 0 && (
          <>
            <h2 className="secao">Responder primeiro</h2>
            <div className="lista-empilhada" style={{ maxWidth: 560 }}>
              {naoLidas.slice(0, 5).map((conversa) => (
                <Link
                  key={conversa.id}
                  href={`/advogado/conversas/${conversa.id}`}
                  className="cartao-de-lista"
                >
                  <span className="conteudo">
                    <span className="titulo">{conversa.titulo}</span>
                    <p className="linha-2">{conversa.ultimaMensagem}</p>
                  </span>
                  <span className="pilula-nao-lidas">{conversa.naoLidas}</span>
                </Link>
              ))}
            </div>
          </>
        )}

        {comNovaMensagem.length > 0 && (
          <>
            <h2 className="secao">Casos que mexeram</h2>
            <div className="lista-empilhada" style={{ maxWidth: 560 }}>
              {comNovaMensagem.slice(0, 5).map((caso) => (
                <Link
                  key={caso.id}
                  href={`/advogado/casos/${caso.id}`}
                  className="cartao-de-lista"
                >
                  <span className="conteudo">
                    <span className="titulo">{caso.titulo}</span>
                    <p className="linha-2">{caso.cliente}</p>
                  </span>
                  <span className="selo dourado">Nova mensagem</span>
                </Link>
              ))}
            </div>
          </>
        )}

        {naoLidas.length === 0 && comNovaMensagem.length === 0 && (
          <p className="vazio" style={{ maxWidth: 560 }}>
            Tudo em dia. Quando chegar mensagem ou um caso mexer, aparece
            aqui.
          </p>
        )}
      </div>
    </PainelDeMensagens>
  );
}
