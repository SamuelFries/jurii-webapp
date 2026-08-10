import {
  conversarComAdvogado,
  conversarComEscritorio,
} from "@/app/inicio/acoes";
import { alternarFavorito } from "@/app/favoritos/acoes";

/**
 * O cartão de advogado ou escritório, um só para o Início e os Favoritos.
 * O coração usa a MESMA RPC do app (toggle_favorite) e o estado nasce de
 * fetch_favorite_ids: nenhum coração adivinhado na tela.
 */
export function CartaoDeProfissional({
  tipo,
  id,
  nome,
  iniciais,
  avatarUrl,
  linha1,
  linha2,
  selo,
  favorito,
  voltar,
}: {
  tipo: "lawyer" | "law_firm";
  id: string;
  nome: string;
  iniciais: string;
  avatarUrl: string | null;
  linha1: string;
  linha2: string;
  selo?: string;
  favorito: boolean;
  voltar: string;
}) {
  return (
    <div className="cartao-de-lista">
      <span className="avatar" aria-hidden>
        {avatarUrl !== null ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" />
        ) : (
          iniciais
        )}
      </span>
      <span className="conteudo">
        <span className="titulo">
          {nome}
          {selo !== undefined && <span className="selo dourado">{selo}</span>}
        </span>
        <p className="linha-2">{linha1}</p>
        <p className="linha-2">{linha2}</p>
        <span className="acoes-em-linha">
          <form action={tipo === "lawyer" ? conversarComAdvogado : conversarComEscritorio}>
            <input type="hidden" name="id" value={id} />
            <button type="submit" className="secundario">
              Conversar
            </button>
          </form>
          <form action={alternarFavorito} className="forma-do-coracao">
            <input type="hidden" name="tipo" value={tipo} />
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="voltar" value={voltar} />
            <button
              type="submit"
              className={favorito ? "coracao ativo" : "coracao"}
              aria-label={
                favorito
                  ? `Remover ${nome} dos favoritos`
                  : `Adicionar ${nome} aos favoritos`
              }
              title={favorito ? "Remover dos favoritos" : "Favoritar"}
            >
              {favorito ? "♥" : "♡"}
            </button>
          </form>
        </span>
      </span>
    </div>
  );
}
