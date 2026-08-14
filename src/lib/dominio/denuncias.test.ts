import { describe, expect, test } from "vitest";

import {
  denunciaDaLinha,
  ladoDaMensagem,
  motivoLegivel,
  quandoAconteceu,
  rotuloDaDecisaoDaDenuncia,
  rotuloDoMotivo,
} from "./denuncias";

const linha = {
  id: "d1",
  reason: "conteudo_abusivo",
  details: "me xingou",
  status: "open",
  created_at: "2026-08-14T18:30:00Z",
  reporter_profile_id: "u1",
  reporter_name: "Cliente Denunciante",
  reported_name: "Advogado Denunciado",
  reported_is_firm: false,
  conversation_id: "c1",
  reported_message_id: null,
  messages: [
    {
      id: "m1",
      autor_id: "u1",
      autor_tipo: "client",
      corpo: "bom dia",
      apagada: false,
      criada_em: "2026-08-14T18:00:00Z",
    },
    {
      id: "m2",
      autor_id: "u2",
      autor_tipo: "lawyer",
      corpo: "resposta ofensiva",
      apagada: true,
      criada_em: "2026-08-14T18:10:00Z",
    },
  ],
};

describe("a denúncia como o painel a lê", () => {
  test("a linha do banco vira ficha, com a fotografia junto", () => {
    const denuncia = denunciaDaLinha(linha);
    expect(denuncia.quemDenunciou).toBe("Cliente Denunciante");
    expect(denuncia.quemFoiDenunciado).toBe("Advogado Denunciado");
    expect(denuncia.mensagens).toHaveLength(2);
    expect(denuncia.mensagens[1].corpo).toBe("resposta ofensiva");
  });

  test("mensagem apagada continua na ficha, MARCADA como apagada", () => {
    // É o ponto de copiar em vez de referenciar: quem ofende e apaga não
    // limpa o próprio rastro. Esconder aqui desfaria a decisão do banco.
    const denuncia = denunciaDaLinha(linha);
    expect(denuncia.mensagens[1].apagada).toBe(true);
    expect(denuncia.mensagens[1].corpo).not.toBe("");
  });

  test("denúncia sem fotografia não quebra a tela", () => {
    // Denúncia anterior a esta migration não tem snapshot, e a tela precisa
    // dizer isso em vez de estourar.
    const denuncia = denunciaDaLinha({ ...linha, messages: undefined });
    expect(denuncia.mensagens).toEqual([]);
  });

  test("status desconhecido cai em aberta, e não some da fila", () => {
    expect(denunciaDaLinha({ ...linha, status: "xpto" }).status).toBe("open");
  });

  test("os cinco motivos do banco têm rótulo", () => {
    // O check constraint fecha em cinco; se alguém acrescentar um sexto sem
    // rótulo, a tela mostraria o identificador cru.
    expect(Object.keys(rotuloDoMotivo).sort()).toEqual([
      "conteudo_abusivo",
      "falsa_identidade",
      "golpe_ou_fraude",
      "outro",
      "spam",
    ]);
    expect(motivoLegivel("golpe_ou_fraude")).toBe("Golpe ou fraude");
  });

  test("motivo novo aparece cru em vez de sumir", () => {
    expect(motivoLegivel("assedio")).toBe("assedio");
  });

  test("o lado de cada mensagem sai de QUEM denunciou, não do papel", () => {
    const denuncia = denunciaDaLinha(linha);
    expect(ladoDaMensagem(denuncia.mensagens[0], denuncia.quemDenunciouId)).toBe(
      "denunciante",
    );
    expect(ladoDaMensagem(denuncia.mensagens[1], denuncia.quemDenunciouId)).toBe(
      "denunciado",
    );
  });

  test("quando quem denuncia é o PROFISSIONAL, os lados não se invertem", () => {
    // O defeito que isto trava, encontrado na primeira tela real: a versão
    // anterior deduzia o lado do tipo do autor (cliente = denunciante), e
    // quando foi a advogada quem denunciou, a fala DELA aparecia atribuída
    // ao cliente. Painel de moderação que troca o autor pune o inocente.
    const denunciadaPelaAdvogada = denunciaDaLinha({
      ...linha,
      reporter_profile_id: "u2",
      reporter_name: "Rita Souza",
      reported_name: "Marcos Cliente",
    });
    // u2 é a advogada, autora da segunda mensagem: ela é a DENUNCIANTE.
    expect(
      ladoDaMensagem(
        denunciadaPelaAdvogada.mensagens[1],
        denunciadaPelaAdvogada.quemDenunciouId,
      ),
    ).toBe("denunciante");
    expect(
      ladoDaMensagem(
        denunciadaPelaAdvogada.mensagens[0],
        denunciadaPelaAdvogada.quemDenunciouId,
      ),
    ).toBe("denunciado");
  });

  test("sem id de autor não chuta lado nenhum", () => {
    expect(
      ladoDaMensagem(
        { id: "m3", autorId: null, autorTipo: "system", corpo: "aviso", apagada: false, criadaEmIso: null },
        "u1",
      ),
    ).toBe("indefinido");
  });

  test("as duas saídas da decisão têm nome em português", () => {
    expect(rotuloDaDecisaoDaDenuncia("reviewed")).toBe("Providência tomada");
    expect(rotuloDaDecisaoDaDenuncia("dismissed")).toBe("Sem providência");
    expect(rotuloDaDecisaoDaDenuncia("open")).toBe("Aberta");
  });

  test("sem data não inventa data", () => {
    expect(quandoAconteceu(null)).toBe("sem data");
    expect(quandoAconteceu("não é data")).toBe("sem data");
    expect(quandoAconteceu("2026-08-14T18:30:00Z")).toMatch(/14\/08\/2026/);
  });
});
