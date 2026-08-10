/**
 * A URL exibível de um avatar, espelho de ProfileAvatar._resolveUrl no app.
 *
 * POR QUE EXISTE: o valor gravado pode ser uma URL completa de OUTRA época
 * (outro projeto, outro host) ou um caminho com o marcador do storage.
 * Renderizar o valor cru quebrava as fotos no webapp: caminho relativo
 * resolvia contra o domínio da página e dava 404 silencioso. O app extrai o
 * caminho depois do marcador, valida o formato e prefixa a origem ATUAL do
 * projeto; aqui é idêntico.
 */

const marcadorDePerfil = "/storage/v1/object/public/profile-avatars/";
const marcadorDeEscritorio = "/storage/v1/object/public/law-firm-avatars/";

// uuid/arquivo para perfil; uuid/uuid/arquivo para escritório.
const caminhoDePerfil = /^[0-9a-fA-F-]{36}\/[A-Za-z0-9._-]{1,240}$/;
const caminhoDeEscritorio =
  /^[0-9a-fA-F-]{36}\/[0-9a-fA-F-]{36}\/[A-Za-z0-9._-]{1,160}$/;

export function urlDoAvatar(cru: string | null): string | null {
  if (cru === null || cru.trim() === "") return null;

  const deEscritorio = cru.includes(marcadorDeEscritorio);
  const marcador = deEscritorio ? marcadorDeEscritorio : marcadorDePerfil;
  const posicao = cru.indexOf(marcador);
  if (posicao < 0) return null;

  const codificado = cru.slice(posicao + marcador.length).split(/[?#]/)[0];
  let caminho: string;
  try {
    caminho = decodeURIComponent(codificado);
  } catch {
    return null;
  }

  const padrao = deEscritorio ? caminhoDeEscritorio : caminhoDePerfil;
  if (!padrao.test(caminho)) return null;

  const origem = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
  if (!origem.startsWith("http")) return null;

  return `${origem}${marcador}${caminho}`;
}
