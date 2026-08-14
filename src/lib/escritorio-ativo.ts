import { cookies } from "next/headers";

/**
 * O ÚLTIMO escritório aberto, guardado em cookie.
 *
 * A VERDADE do contexto é a ROTA (`/escritorio/{id}/...`), não este cookie.
 * Ele serve só para duas perguntas que a rota não responde: para onde mandar
 * quem entrou agora, e para onde mandar quem digitou `/escritorio` sem id.
 *
 * Por que a rota manda, e não o cookie: com o id na URL, o escritório que a
 * tela LÊ e o que a ação GRAVA vêm do mesmo lugar, o que elimina de uma vez a
 * classe de defeito "a tela mostra A e o formulário grava B". E duas abas em
 * escritórios diferentes funcionam, que é como uma pessoa com duas bancas
 * realmente trabalha; com o contexto em cookie, abrir a segunda aba mudaria a
 * primeira em silêncio.
 *
 * O cookie NÃO é autoridade: quem o lê sempre confere o id contra a lista de
 * vínculos antes de usar (ver `escritorioPadrao`). Cookie adulterado só
 * consegue apontar para um escritório onde a pessoa já entra.
 */
const NOME = "jurii_escritorio";

/** Um ano: a preferência de quem trabalha na mesma banca todo dia. */
const VALIDADE_EM_SEGUNDOS = 60 * 60 * 24 * 365;

export async function escritorioPreferido(): Promise<string | null> {
  const armazem = await cookies();
  return armazem.get(NOME)?.value ?? null;
}

/**
 * Grava a preferência. Chamado da ação de troca, nunca de uma página: em
 * Server Component o Next proíbe escrever cookie, e insistir nisso daria
 * erro só em produção.
 */
export async function guardaEscritorioPreferido(id: string): Promise<void> {
  const armazem = await cookies();
  armazem.set(NOME, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: VALIDADE_EM_SEGUNDOS,
  });
}
