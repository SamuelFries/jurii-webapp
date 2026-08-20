"use client";

import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import {
  clienteAguarda,
  comecaSequencia,
  resolveAutor,
  separadorDeDia,
  type MembroParaAutoria,
} from "@/lib/dominio/chat-aberto";
import { esperaDesde, esperandoHaMuito } from "@/lib/dominio/conversas";

import { caminhoDoAnexo, validaAnexo } from "@/lib/anexos";
import { rotuloDeHorario } from "@/lib/dominio/conversas";
import {
  indicacaoDaMetadata,
  type IndicacaoDeAdvogado,
} from "@/lib/dominio/conversas";
import {
  estadoDeEntrega,
  rotuloDoEstadoDeEntrega,
  type EstadoDeEntrega,
  podeApagarSelecaoParaTodos,
  podeSelecionar,
  rotuloDoStatusDaSolicitacao,
  solicitacaoDaMetadata,
  type SolicitacaoDeCaso,
} from "@/lib/dominio/chat";
import { clienteDoNavegador } from "@/lib/supabase/navegador";

export interface AnexoParaTela {
  nome: string;
  tipoMime: string;
  /** Assinada por 1h; nula quando o servidor não conseguiu assinar. */
  url: string | null;
}

export interface MensagemParaTela {
  id: string;
  corpo: string;
  minha: boolean;
  /** Quem escreveu, para a tela dizer nome e papel. Nulo = sistema. */
  senderId?: string | null;
  senderType?: string;
  criadaEmIso: string;
  apagadaParaTodos: boolean;
  tipo: "texto" | "anexo" | "solicitacao_de_caso" | "indicacao";
  anexo: AnexoParaTela | null;
  indicacao?: IndicacaoDeAdvogado | null;
  solicitacao?: SolicitacaoDeCaso | null;
  entrega?: EstadoDeEntrega;
}

/**
 * O chat, com o MESMO contrato do app (chat_screen.dart):
 * histórico das 100 mais recentes, envio por insert em `messages` (a RLS
 * decide quem pode), sender_type 'client' ou 'lawyer' conforme o fluxo, e
 * mark_conversation_read ao abrir e ao receber com a tela aberta.
 *
 * Tempo real: assina INSERT em messages desta conversa. Chegou mensagem de
 * outra pessoa, entra na lista e é marcada como lida na hora, porque a
 * pessoa ESTÁ olhando; as minhas já entraram no envio (o eco do canal é
 * deduplicado pelo id).
 */
export function Chat({
  conversaId,
  meuId,
  senderType,
  mensagensIniciais,
  temAnterioresInicial = false,
  bloqueada = false,
  nomeDoCliente = "Cliente",
  equipe = [],
}: {
  conversaId: string;
  meuId: string;
  senderType: "client" | "lawyer";
  mensagensIniciais: MensagemParaTela[];
  /** Se a primeira página não é o começo da conversa (paginação para cima). */
  temAnterioresInicial?: boolean;
  /** Conversa bloqueada: o servidor recusa envio; a tela avisa antes. */
  bloqueada?: boolean;
  /** Para dar nome e papel a cada mensagem que não é minha. */
  nomeDoCliente?: string;
  equipe?: MembroParaAutoria[];
}) {
  const router = useRouter();
  const [mensagens, setMensagens] = useState(mensagensIniciais);
  const [temAnteriores, setTemAnteriores] = useState(temAnterioresInicial);
  const [carregandoAnteriores, setCarregandoAnteriores] = useState(false);
  // Novas chegaram enquanto eu lia lá em cima: conta para o botão "voltar ao
  // fim", em vez de me arrastar para baixo.
  const [novasForaDaVista, setNovasForaDaVista] = useState(0);
  const listaRef = useRef<HTMLDivElement>(null);
  // Se a pessoa está (ou estava) no fim, acompanhamos; se subiu para ler,
  // NÃO. Lido a cada scroll, decidido a cada mensagem nova.
  const pertoDoFim = useRef(true);
  const rascunhoFalhou = useRef<string | null>(null);
  // Distância do fim a restaurar DEPOIS que a página anterior entrar por
  // cima. Guardada aqui e consumida no layout effect, porque o
  // requestAnimationFrame pode disparar antes de o React commitar as bolhas
  // novas, e aí a conta sai com o scrollHeight velho.
  const restaurarDistanciaDoFim = useRef<number | null>(null);
  const [rascunho, setRascunho] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [subindoAnexo, setSubindoAnexo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  // Modo de seleção, como no app: segurar entra, tocar marca e desmarca.
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [perguntandoApagar, setPerguntandoApagar] = useState(false);
  const [apagando, setApagando] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);
  const seguraPor = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fimDaLista = useRef<HTMLDivElement>(null);
  const seletorDeArquivo = useRef<HTMLInputElement>(null);
  const seletorDeImagem = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const supabase = clienteDoNavegador();

    // ARMADILHA que estava aqui: o builder do supabase-js é PREGUIÇOSO. Ele
    // só dispara o HTTP quando alguém faz await ou .then(); `void
    // supabase.rpc(...)` cria o builder e joga fora sem nunca enviar. As duas
    // chamadas abaixo eram exatamente isso, então abrir a conversa no webapp
    // NÃO marcava nada: as mensagens ficavam não lidas para sempre (o "3" no
    // badge que nunca sumia) e o tique de entregue nunca acendia no cliente.
    //
    // Marcar como lida precisa também revalidar a lista ao lado (server
    // component, force-dynamic), que foi renderizada antes desta chamada com
    // o badge cheio. router.refresh() re-renderiza só a parte do servidor; o
    // estado deste chat (mensagens, scroll) é de cliente e sobrevive. Só
    // revalida quando algo foi de fato marcado, para não virar refresh em
    // loop.
    void supabase
      .rpc("mark_conversation_read", { conversation_id_value: conversaId })
      .then(({ data }) => {
        if (typeof data === "number" && data > 0) router.refresh();
      });

    // E marca como ENTREGUES as que chegaram enquanto eu estava fora. O .then
    // vazio não é decoração: é o que DISPARA a chamada (ver acima). Falha em
    // silêncio de propósito: é sinal de cortesia, não pode virar erro na cara
    // de ninguém.
    void supabase
      .rpc("mark_messages_delivered", { conversation_ids_value: [conversaId] })
      .then(
        () => {},
        () => {},
      );

    const canal = supabase
      .channel(`web_chat_${conversaId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversaId}`,
        },
        (evento) => {
          const linha = evento.new as Record<string, unknown>;
          const metadata = (linha.metadata ?? {}) as Record<string, unknown>;
          const indicacao = indicacaoDaMetadata(metadata);
          const solicitacao = solicitacaoDaMetadata(metadata);
          const tipo =
            metadata.type === "chat_attachment"
              ? "anexo"
              : metadata.type === "case_request"
                ? "solicitacao_de_caso"
                : indicacao !== null
                  ? "indicacao"
                  : "texto";
          const nova: MensagemParaTela = {
            id: String(linha.id),
            corpo: String(linha.body ?? ""),
            minha: String(linha.sender_id) === meuId,
            senderId: linha.sender_id == null ? null : String(linha.sender_id),
            senderType: String(linha.sender_type ?? ""),
            criadaEmIso: String(linha.created_at),
            apagadaParaTodos: linha.deleted_for_all_at != null,
            tipo,
            anexo: null,
            indicacao,
            solicitacao,
            entrega: estadoDeEntrega({
              entregueEm:
                linha.delivered_at == null ? null : String(linha.delivered_at),
              lidaEm: linha.read_at == null ? null : String(linha.read_at),
            }),
          };
          setMensagens((atuais) =>
            atuais.some((mensagem) => mensagem.id === nova.id)
              ? atuais
              : [...atuais, nova],
          );
          if (tipo === "anexo") {
            // O conteúdo mora em message_attachments: busca e assina, e a
            // bolha troca o "Anexo" seco pelo arquivo de verdade.
            void (async () => {
              const { data: anexo } = await supabase
                .from("message_attachments")
                .select("file_name, mime_type, storage_path")
                .eq("message_id", String(linha.id))
                .maybeSingle();
              if (!anexo) return;
              const { data: assinada } = await supabase.storage
                .from("chat-attachments")
                .createSignedUrl(String(anexo.storage_path), 3600);
              setMensagens((atuais) =>
                atuais.map((mensagem) =>
                  mensagem.id === String(linha.id)
                    ? {
                        ...mensagem,
                        anexo: {
                          nome: String(anexo.file_name ?? "arquivo"),
                          tipoMime: String(anexo.mime_type ?? ""),
                          url: assinada?.signedUrl ?? null,
                        },
                      }
                    : mensagem,
                ),
              );
            })();
          }
          if (!nova.minha) {
            // Chegou de outra pessoa com a tela aberta: já é lida, e a lista
            // ao lado precisa saber (subiu de 0 para 1 no badge ao chegar).
            void supabase
              .rpc("mark_conversation_read", { conversation_id_value: conversaId })
              .then(({ data }) => {
                if (typeof data === "number" && data > 0) router.refresh();
              });
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(canal);
    };
  }, [conversaId, meuId, router]);

  // ---- SCROLL COMO FERRAMENTA, não como visualizador --------------------
  //
  // As regras, todas testáveis pelo uso e não pelo código:
  //  - abrir a conversa: já no fim;
  //  - subir para ler: fica onde está;
  //  - chegar mensagem nova enquanto leio uma antiga: NÃO me arrasta; conta
  //    no botão "N novas · voltar ao fim";
  //  - carregar anteriores ao chegar no topo: a posição de leitura fica
  //    EXATAMENTE onde estava (compensa a altura que entrou por cima);
  //  - voltar ao fim: um clique, ou rolar até lá (o botão some);
  //  - enviar estando no meio: vai para o fim (a pessoa quer ver o que
  //    mandou).
  useEffect(() => {
    // Primeira montagem: no fim, sem animação.
    const lista = listaRef.current;
    if (lista) lista.scrollTop = lista.scrollHeight;
    pertoDoFim.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversaId]);

  function estaPertoDoFim(el: HTMLDivElement): boolean {
    return el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }

  function aoRolar() {
    const lista = listaRef.current;
    if (!lista) return;
    const perto = estaPertoDoFim(lista);
    pertoDoFim.current = perto;
    if (perto && novasForaDaVista > 0) setNovasForaDaVista(0);
    // Topo: busca a página anterior. 200px de antecedência para a página
    // chegar antes de a pessoa bater na borda.
    if (lista.scrollTop < 200 && temAnteriores && !carregandoAnteriores) {
      void carregarAnteriores();
    }
  }

  function irParaOFim(suave = true) {
    const lista = listaRef.current;
    if (!lista) return;
    lista.scrollTo({ top: lista.scrollHeight, behavior: suave ? "smooth" : "auto" });
    pertoDoFim.current = true;
    setNovasForaDaVista(0);
  }

  // Mensagem NOVA (minha ou deles): decide acompanhar ou não. Roda depois do
  // layout para o scrollHeight já incluir a bolha nova.
  const ultimoTotal = useRef(mensagens.length);
  useLayoutEffect(() => {
    // Página anterior entrou por CIMA: restaura a distância do fim medida
    // antes, e a mensagem que a pessoa lia fica na mesma altura da tela.
    // O ultimoTotal já foi somado em carregarAnteriores, então isto não é
    // "mensagem nova".
    if (restaurarDistanciaDoFim.current !== null) {
      const l = listaRef.current;
      if (l) l.scrollTop = l.scrollHeight - restaurarDistanciaDoFim.current;
      restaurarDistanciaDoFim.current = null;
      ultimoTotal.current = mensagens.length;
      return;
    }
    if (mensagens.length <= ultimoTotal.current) {
      ultimoTotal.current = mensagens.length;
      return;
    }
    const cresceu = mensagens.length - ultimoTotal.current;
    ultimoTotal.current = mensagens.length;
    const ultima = mensagens[mensagens.length - 1];
    if (ultima?.minha || pertoDoFim.current) {
      irParaOFim(false);
    } else {
      setNovasForaDaVista((n) => n + cresceu);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mensagens.length]);

  async function carregarAnteriores() {
    const lista = listaRef.current;
    const primeira = mensagens[0];
    if (!lista || !primeira || carregandoAnteriores) return;
    setCarregandoAnteriores(true);
    // A posição de leitura, medida do FIM: é o que preservamos.
    const distanciaDoFim = lista.scrollHeight - lista.scrollTop;
    try {
      const supabase = clienteDoNavegador();
      const { data } = await supabase.rpc("fetch_conversation_messages_page", {
        conversation_id_value: conversaId,
        before_created_at: primeira.criadaEmIso,
        before_id: primeira.id,
        page_size: 51,
      });
      const brutas = ((data as Record<string, unknown>[] | null) ?? []);
      const mais = brutas.length > 50;
      const linhas = (mais ? brutas.slice(0, 50) : brutas).slice().reverse();
      const anteriores: MensagemParaTela[] = linhas.map((linha) => {
        const metadata = (linha.metadata ?? {}) as Record<string, unknown>;
        const indicacao = indicacaoDaMetadata(metadata);
        const tipo: MensagemParaTela["tipo"] =
          metadata.type === "chat_attachment"
            ? "anexo"
            : metadata.type === "case_request"
              ? "solicitacao_de_caso"
              : indicacao !== null
                ? "indicacao"
                : "texto";
        return {
          id: String(linha.id),
          corpo: String(linha.body ?? ""),
          minha: String(linha.sender_id) === meuId,
          senderId: linha.sender_id == null ? null : String(linha.sender_id),
          senderType: String(linha.sender_type ?? ""),
          criadaEmIso: String(linha.created_at),
          apagadaParaTodos: linha.deleted_for_all_at != null,
          tipo,
          anexo: null,
          indicacao,
          solicitacao: solicitacaoDaMetadata(metadata),
          entrega: estadoDeEntrega({
            entregueEm: linha.delivered_at == null ? null : String(linha.delivered_at),
            lidaEm: linha.read_at == null ? null : String(linha.read_at),
          }),
        };
      });
      const existentes = new Set(mensagens.map((m) => m.id));
      const novas = anteriores.filter((m) => !existentes.has(m.id));
      ultimoTotal.current += novas.length; // não conta como "nova no fim"
      // A restauração acontece no layout effect, DEPOIS do commit: é lá que
      // o scrollHeight já inclui o que entrou por cima.
      restaurarDistanciaDoFim.current = distanciaDoFim;
      setMensagens((atuais) => [...novas, ...atuais]);
      setTemAnteriores(mais);
    } finally {
      setCarregandoAnteriores(false);
    }
  }

  async function enviar() {
    const corpo = rascunho.trim();
    if (corpo === "" || enviando) return;
    setEnviando(true);
    setErro(null);

    const supabase = clienteDoNavegador();
    const { data, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversaId,
        sender_id: meuId,
        sender_type: senderType,
        body: corpo,
      })
      .select("id, body, sender_id, created_at, deleted_for_all_at")
      .single();

    if (error || data === null) {
      // O texto FICA no campo (setRascunho só roda no sucesso), e o aviso
      // fica colado ao compositor com "Tentar de novo": erro de envio longe
      // do campo era o que o toast fazia por padrão.
      rascunhoFalhou.current = corpo;
      setErro("A mensagem não foi enviada.");
      setEnviando(false);
      return;
    }
    rascunhoFalhou.current = null;

    setMensagens((atuais) =>
      atuais.some((mensagem) => mensagem.id === String(data.id))
        ? atuais
        : [
            ...atuais,
            {
              id: String(data.id),
              corpo: String(data.body),
              minha: true,
              senderId: meuId,
              senderType,
              criadaEmIso: String(data.created_at),
              apagadaParaTodos: false,
              tipo: "texto",
              entrega: "enviada",
              anexo: null,
            },
          ],
    );
    setRascunho("");
    setEnviando(false);
  }

  /**
   * O MESMO fluxo do app: sobe para chat-attachments (na pasta do próprio
   * usuário, que a RPC exige), registra por send_chat_attachment e, se a
   * RPC recusar, REMOVE o arquivo órfão do storage. A validação local só
   * evita subir 10 MB para ouvir não: quem manda é o servidor.
   */
  async function enviarAnexo(arquivo: File) {
    const veredito = validaAnexo(arquivo.type, arquivo.size);
    if ("erro" in veredito) {
      setErro(veredito.erro);
      return;
    }
    setSubindoAnexo(true);
    setErro(null);

    const supabase = clienteDoNavegador();
    const caminho = caminhoDoAnexo(
      meuId,
      conversaId,
      arquivo.name,
      Date.now() * 1000,
    );

    const { error: erroDeUpload } = await supabase.storage
      .from("chat-attachments")
      .upload(caminho, arquivo, { contentType: arquivo.type, upsert: false });
    if (erroDeUpload) {
      setErro("Não foi possível enviar o arquivo. Tente de novo.");
      setSubindoAnexo(false);
      return;
    }

    const { data, error: erroDaRpc } = await supabase.rpc(
      "send_chat_attachment",
      {
        conversation_id_value: conversaId,
        file_name_value: arquivo.name,
        mime_type_value: arquivo.type,
        file_size_bytes_value: arquivo.size,
        storage_path_value: caminho,
        kind_value: veredito.kind,
        sender_type_value: senderType,
      },
    );

    if (erroDaRpc || data == null) {
      // Arquivo sem registro é órfão: limpa, como o app faz.
      await supabase.storage.from("chat-attachments").remove([caminho]);
      setErro("O servidor recusou o anexo. Confira o tipo e o tamanho.");
      setSubindoAnexo(false);
      return;
    }

    const linha = (data as Record<string, unknown>[])[0] ?? {};
    const idDaMensagem = String(linha.id ?? linha.message_id ?? "");
    const { data: assinada } = await supabase.storage
      .from("chat-attachments")
      .createSignedUrl(caminho, 3600);

    if (idDaMensagem !== "") {
      setMensagens((atuais) =>
        atuais.some((mensagem) => mensagem.id === idDaMensagem)
          ? atuais.map((mensagem) =>
              mensagem.id === idDaMensagem && mensagem.anexo === null
                ? {
                    ...mensagem,
                    anexo: {
                      nome: arquivo.name,
                      tipoMime: arquivo.type,
                      url: assinada?.signedUrl ?? null,
                    },
                  }
                : mensagem,
            )
          : [
              ...atuais,
              {
                id: idDaMensagem,
                corpo: "",
                minha: true,
                senderId: meuId,
                senderType,
                criadaEmIso: new Date().toISOString(),
                apagadaParaTodos: false,
                tipo: "anexo",
                anexo: {
                  nome: arquivo.name,
                  tipoMime: arquivo.type,
                  url: assinada?.signedUrl ?? null,
                },
              },
            ],
      );
    }
    setSubindoAnexo(false);
  }

  /** Apagar para todos, a MESMA RPC do app (delete_messages_for_everyone):
   * a bolha vira "Mensagem apagada" na hora; o servidor decide se pode. */
  function alternaSelecao(id: string) {
    setSelecionadas((atuais) => {
      const proxima = new Set(atuais);
      if (!proxima.delete(id)) proxima.add(id);
      return proxima;
    });
  }

  function iniciaSeguraDedo(mensagem: MensagemParaTela) {
    if (!podeSelecionar(mensagem)) return;
    seguraPor.current = setTimeout(() => alternaSelecao(mensagem.id), 450);
  }

  function cancelaSeguraDedo() {
    if (seguraPor.current !== null) {
      clearTimeout(seguraPor.current);
      seguraPor.current = null;
    }
  }

  /**
   * Apagar, com as duas opções do app. "Para todos" reescreve o que o outro
   * lado já leu e por isso tem janela de 60 horas no servidor; "para mim"
   * some só daqui e não gera evento de tempo real, então a saída da tela é
   * por conta do navegador.
   */
  async function apagar(escopo: "todos" | "mim") {
    const ids = [...selecionadas];
    if (ids.length === 0) return;
    setApagando(true);
    const supabase = clienteDoNavegador();
    const { error } = await supabase.rpc(
      escopo === "todos" ? "delete_messages_for_everyone" : "delete_messages_for_me",
      { message_ids_value: ids },
    );
    setApagando(false);
    setPerguntandoApagar(false);
    if (error) {
      setErro("Não foi possível apagar. Tente de novo.");
      return;
    }
    setSelecionadas(new Set());
    setMensagens((atuais) =>
      escopo === "todos"
        ? atuais.map((mensagem) =>
            ids.includes(mensagem.id)
              ? { ...mensagem, apagadaParaTodos: true, corpo: "", anexo: null }
              : mensagem,
          )
        : atuais.filter((mensagem) => !ids.includes(mensagem.id)),
    );
  }

  const agora = new Date();
  const emSelecao = selecionadas.size > 0;
  const escolhidas = mensagens.filter((mensagem) =>
    selecionadas.has(mensagem.id),
  );
  const cabeApagarParaTodos = podeApagarSelecaoParaTodos(escolhidas, agora);

  return (
    <>
      {emSelecao && (
        <div className="barra-de-selecao">
          <button
            type="button"
            className="discreto"
            onClick={() => setSelecionadas(new Set())}
            aria-label="Sair da seleção"
          >
            ✕
          </button>
          <span className="contagem">
            {selecionadas.size === 1
              ? "1 mensagem"
              : `${selecionadas.size} mensagens`}
          </span>
          <button
            type="button"
            className="secundario"
            onClick={() => setPerguntandoApagar(true)}
          >
            Apagar
          </button>
        </div>
      )}

      {perguntandoApagar && (
        <div className="folha-de-apagar">
          <strong>
            {selecionadas.size === 1
              ? "Apagar esta mensagem?"
              : `Apagar ${selecionadas.size} mensagens?`}
          </strong>
          {cabeApagarParaTodos && (
            <button
              type="button"
              className="secundario"
              disabled={apagando}
              onClick={() => void apagar("todos")}
            >
              <strong>Apagar para todos</strong>
              <span className="detalhe">
                O conteúdo some para os dois lados e não volta.
              </span>
            </button>
          )}
          <button
            type="button"
            className="secundario"
            disabled={apagando}
            onClick={() => void apagar("mim")}
          >
            <strong>Apagar para mim</strong>
            <span className="detalhe">
              {cabeApagarParaTodos
                ? "Some só da sua conversa."
                : "Some só da sua conversa. A outra pessoa continua vendo."}
            </span>
          </button>
          <button
            type="button"
            className="discreto"
            onClick={() => setPerguntandoApagar(false)}
          >
            Cancelar
          </button>
        </div>
      )}

      <div className="chat" ref={listaRef} onScroll={aoRolar}>
        {carregandoAnteriores && (
          <p className="marco-do-historico">Carregando mensagens anteriores…</p>
        )}
        {!temAnteriores && mensagens.length > 0 && (
          <p className="marco-do-historico">Início da conversa</p>
        )}
        {mensagens.length === 0 && (
          <p className="vazio">Nenhuma mensagem ainda. Comece a conversa.</p>
        )}
        {mensagens.map((mensagem, indice) => {
          const marcada = selecionadas.has(mensagem.id);
          const selecionavel = podeSelecionar(mensagem);
          const anterior = indice > 0 ? mensagens[indice - 1] : null;
          const criadaEm = new Date(mensagem.criadaEmIso);
          const dia = separadorDeDia(
            criadaEm,
            anterior ? new Date(anterior.criadaEmIso) : null,
            agora,
          );
          const autor = resolveAutor(
            { senderId: mensagem.senderId ?? null, senderType: mensagem.senderType ?? "" },
            { meuId, nomeDoCliente, equipe },
          );
          const autorAnterior = anterior
            ? resolveAutor(
                { senderId: anterior.senderId ?? null, senderType: anterior.senderType ?? "" },
                { meuId, nomeDoCliente, equipe },
              )
            : null;
          const inicioDeSequencia =
            dia !== null ||
            comecaSequencia(
              { autorId: autor.id, criadaEm },
              anterior && autorAnterior
                ? { autorId: autorAnterior.id, criadaEm: new Date(anterior.criadaEmIso) }
                : null,
            );
          // O lado visual: minha à direita; cliente à esquerda; EQUIPE que
          // não sou eu também à esquerda, mas com a cara de "lado de dentro"
          // (surface-2 + fio navy). Sem isso a secretária via cliente e
          // sócia idênticos, e a conversa virava monólogo.
          const lado = mensagem.minha
            ? "minha"
            : autor.lado === "equipe"
              ? "equipe"
              : autor.lado === "sistema"
                ? "sistema"
                : "deles";
          return (
            <div key={mensagem.id} className="grupo-de-mensagem">
            {dia !== null && (
              <div className="separador-de-dia" role="separator">
                <span>{dia}</span>
              </div>
            )}
            {/* Nome + PAPEL na primeira mensagem da sequência de quem não sou
                eu. O papel é o da pessoa na equipe/na conversa: "Cliente",
                "Sócio", "Advogado", "Secretária". Sem avatar por linha. */}
            {inicioDeSequencia && !mensagem.minha && autor.lado !== "sistema" && (
              <span className={`autor-da-sequencia lado-${autor.lado}`}>
                <span className="nome-do-autor">{autor.nome}</span>
                <span className="papel-do-autor">{autor.papel}</span>
              </span>
            )}
            <div
              className={[
                "linha-de-mensagem",
                lado,
                marcada ? "marcada" : "",
                inicioDeSequencia ? "inicio" : "continuacao",
              ]
                .filter(Boolean)
                .join(" ")}
              onPointerDown={() => iniciaSeguraDedo(mensagem)}
              onPointerUp={cancelaSeguraDedo}
              onPointerLeave={cancelaSeguraDedo}
              onClick={() => {
                if (emSelecao && selecionavel) alternaSelecao(mensagem.id);
              }}
              onContextMenu={(evento) => {
                // No computador, o gesto natural é o botão direito.
                if (!selecionavel) return;
                evento.preventDefault();
                alternaSelecao(mensagem.id);
              }}
            >
              <div
                className={[
                  "bolha",
                  lado,
                  mensagem.apagadaParaTodos ? "apagada" : "",
                  mensagem.tipo === "solicitacao_de_caso" ? "cartao-no-chat" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <CorpoDaMensagem mensagem={mensagem} />
                <span className="horario">
                  {/* Só a HORA: o dia está no separador. "15/08 às 14:20"
                      em cada bolha era o único marcador de tempo e virava
                      ruído numa conversa de três dias. */}
                  {horaCurta(criadaEm)}
                  {mensagem.minha && !mensagem.apagadaParaTodos && (
                    <TiqueDeEntrega estado={mensagem.entrega ?? "enviada"} />
                  )}
                </span>
              </div>
            </div>
            </div>
          );
        })}
        <div ref={fimDaLista} />
      </div>

      {/* Novas chegaram enquanto eu lia lá em cima: um botão, não um puxão. */}
      {novasForaDaVista > 0 && (
        <button
          type="button"
          className="voltar-ao-fim"
          onClick={() => irParaOFim(true)}
        >
          {novasForaDaVista === 1
            ? "1 nova mensagem · ir para o fim"
            : `${novasForaDaVista} novas mensagens · ir para o fim`}
        </button>
      )}

      {/* A FAIXA DE ESTADO: só quando o cliente falou por último. É a
          resposta direta a "depois de 4 horas, a bola está comigo?". Some
          quando a última é da equipe. */}
      {(() => {
        const estado = clienteAguarda(
          mensagens.map((m) => ({
            lado: resolveAutor(
              { senderId: m.senderId ?? null, senderType: m.senderType ?? "" },
              { meuId, nomeDoCliente, equipe },
            ).lado,
            criadaEm: new Date(m.criadaEmIso),
          })),
        );
        if (!estado.aguarda || estado.desde === null || senderType === "client") return null;
        const longa = esperandoHaMuito(estado.desde, agora);
        return (
          <p className={longa ? "faixa-de-estado espera-longa" : "faixa-de-estado"}>
            <span className="ponto" aria-hidden />
            Cliente aguarda resposta {esperaDesde(estado.desde, agora)}
          </p>
        );
      })()}

      {/* Erro de envio COLADO ao compositor, fora do toast (data-fixo), com
          o rascunho preservado e reenvio a um clique. */}
      {erro !== null && (
        <p className="erro erro-de-envio" data-fixo="true">
          {erro}{" "}
          <button
            type="button"
            className="discreto compacto"
            onClick={() => {
              setErro(null);
              if (rascunhoFalhou.current !== null && rascunho.trim() === "") {
                setRascunho(rascunhoFalhou.current);
              }
              void enviar();
            }}
          >
            Tentar de novo
          </button>
        </p>
      )}

      {bloqueada && (
        <p className="erro">
          Esta conversa está bloqueada. Nenhum dos lados consegue enviar
          mensagens enquanto o bloqueio durar.
        </p>
      )}

      <div className="caixa-de-envio">
        {/* Dois seletores, e não um: o do app separa "Enviar foto" de
            "Anexar arquivo", e o accept mais estreito faz o sistema abrir já
            filtrado, em vez de listar tudo e recusar depois. */}
        <input
          ref={seletorDeImagem}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hidden
          onChange={(evento) => {
            const arquivo = evento.target.files?.[0];
            evento.target.value = "";
            setMenuAberto(false);
            if (arquivo) void enviarAnexo(arquivo);
          }}
        />
        <input
          ref={seletorDeArquivo}
          type="file"
          accept="application/pdf,.doc,.docx"
          hidden
          onChange={(evento) => {
            const arquivo = evento.target.files?.[0];
            evento.target.value = "";
            setMenuAberto(false);
            if (arquivo) void enviarAnexo(arquivo);
          }}
        />

        <div className="mais-opcoes">
          {menuAberto && !subindoAnexo && (
            <div className="menu-do-mais" role="menu">
              <button
                type="button"
                role="menuitem"
                onClick={() => seletorDeImagem.current?.click()}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="m21 15-5-5L5 21" />
                </svg>
                Enviar foto
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => seletorDeArquivo.current?.click()}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M21.44 11.05 12.25 20.24a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
                Anexar arquivo
              </button>
            </div>
          )}
          <button
            type="button"
            className={menuAberto ? "botao-do-mais aberto" : "botao-do-mais"}
            onClick={() => setMenuAberto(!menuAberto)}
            disabled={subindoAnexo || bloqueada}
            aria-label={menuAberto ? "Fechar opções" : "Mais opções"}
            aria-expanded={menuAberto}
            title={menuAberto ? "Fechar opções" : "Mais opções"}
          >
            {subindoAnexo ? (
              <span className="giro" aria-hidden />
            ) : (
              /* 45 graus: o "+" vira "×". Um quarto de volta literal
                 deixaria o ícone idêntico ao estado inicial. */
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M12 5v14M5 12h14" />
              </svg>
            )}
          </button>
        </div>
        <textarea
          rows={2}
          disabled={bloqueada}
          placeholder={bloqueada ? "Conversa bloqueada" : "Escreva sua mensagem"}
          aria-label="Escreva sua mensagem"
          value={rascunho}
          onChange={(evento) => setRascunho(evento.target.value)}
          onKeyDown={(evento) => {
            if (evento.key === "Enter" && !evento.shiftKey) {
              evento.preventDefault();
              void enviar();
            }
          }}
        />
        <button
          type="button"
          onClick={() => void enviar()}
          disabled={enviando || bloqueada}
        >
          Enviar
        </button>
      </div>
    </>
  );
}

/**
 * O tique da própria mensagem: um risco (enviada), dois riscos (entregue),
 * dois riscos DOURADOS (visualizada). Só a leitura é notícia, e por isso só
 * ela muda de cor.
 *
 * O rótulo não é decoração: sem ele um leitor de tela anuncia "imagem" e a
 * informação inteira se perde para quem não distingue um risco de dois.
 */
/** "14:20", no fuso do Brasil, para a bolha. O dia mora no separador. */
function horaCurta(data: Date): string {
  const local = new Date(data.getTime() - 3 * 3_600_000);
  return `${String(local.getUTCHours()).padStart(2, "0")}:${String(
    local.getUTCMinutes(),
  ).padStart(2, "0")}`;
}

function TiqueDeEntrega({ estado }: { estado: EstadoDeEntrega }) {
  return (
    <span
      className={`tique ${estado}`}
      role="img"
      aria-label={rotuloDoEstadoDeEntrega(estado)}
      title={rotuloDoEstadoDeEntrega(estado)}
    >
      <svg viewBox="0 0 20 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M1.5 6.5 5 10l6.5-8" />
        {estado !== "enviada" && <path d="M8 10l6.5-8" />}
      </svg>
    </span>
  );
}

/** O conteúdo da bolha conforme o tipo. Mensagem de anexo NUNCA vira bolha
 * vazia: o corpo dela é vazio de verdade (o conteúdo mora no storage), e
 * bolha em branco parece defeito. */
function CorpoDaMensagem({ mensagem }: { mensagem: MensagemParaTela }) {
  if (mensagem.apagadaParaTodos) return <>Mensagem apagada</>;

  if (mensagem.tipo === "anexo") {
    if (mensagem.anexo === null) return <>Anexo</>;
    const ehImagem =
      mensagem.anexo.tipoMime.startsWith("image/") &&
      mensagem.anexo.url !== null;
    if (ehImagem) {
      return (
        <a href={mensagem.anexo.url!} target="_blank" rel="noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mensagem.anexo.url!}
            alt={mensagem.anexo.nome}
            className="imagem-do-anexo"
          />
        </a>
      );
    }
    if (mensagem.anexo.url !== null) {
      return (
        <a
          href={mensagem.anexo.url}
          target="_blank"
          rel="noreferrer"
          className="ficha-de-anexo"
        >
          {mensagem.anexo.nome}
        </a>
      );
    }
    return <>Anexo: {mensagem.anexo.nome}</>;
  }

  if (mensagem.tipo === "indicacao" && mensagem.indicacao != null) {
    const indicacao = mensagem.indicacao;
    return (
      <span className="indicacao-no-chat">
        <span className="selo-de-solicitacao">Indicação do escritório</span>
        <strong>{indicacao.nome}</strong>
        <span className="detalhe">
          {indicacao.oab}
          {indicacao.area !== null ? ` · ${indicacao.area}` : ""}
        </span>
        {indicacao.nota !== null && <span>{indicacao.nota}</span>}
        {/* O cliente aceita a indicação PELO APLICATIVO: o webapp é a mesa
            do profissional e não tem mais telas de cliente. Aqui o cartão
            é o registro do que foi sugerido. */}
        <a
          className="botao secundario"
          href={`/profissionais/${indicacao.lawyerId}`}
        >
          Ver o cartão do advogado
        </a>
      </span>
    );
  }

  if (mensagem.tipo === "solicitacao_de_caso") {
    // O cartão do app: título grande, "área" na segunda linha e o SELO DE
    // ESTADO, que é o que o profissional volta para conferir. Aceitar e
    // recusar são do cliente, no aplicativo, e por isso não há botão aqui:
    // botão que só informa seria link morto.
    const solicitacao = mensagem.solicitacao;
    const status = solicitacao?.status ?? "pending";
    return (
      <>
        <span className="selo-de-solicitacao">Solicitação de caso</span>
        <strong className="titulo-da-solicitacao">
          {solicitacao?.titulo ?? "Solicitação de caso"}
        </strong>
        <span className="detalhe">
          {solicitacao?.area ?? "Atendimento jurídico"}
        </span>
        {/* O corpo NÃO aparece: o servidor grava textos como "Caso aceito:
            titulo", que só repetem o que o selo de estado já diz. O app
            também não mostra o corpo no cartão. */}
        <span className={`estado-da-solicitacao ${status}`}>
          {rotuloDoStatusDaSolicitacao(status)}
        </span>
      </>
    );
  }

  return <>{mensagem.corpo}</>;
}
