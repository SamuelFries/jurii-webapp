import { contextoLogado, exigeAdvogado } from "@/lib/contexto";
import { areasDoDireito } from "@/lib/dominio/areas";

import { salvarAreas, salvarBio } from "./acoes";

export const dynamic = "force-dynamic";

/**
 * O perfil profissional do advogado: a vitrine que o cliente vê na
 * descoberta. Bio e áreas pelas MESMAS RPCs do app; a leitura é a própria
 * linha de lawyer_profiles (RLS: o dono sempre lê a sua).
 */
export default async function PerfilDoAdvogado({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  const { ok, erro } = await searchParams;
  const contexto = await contextoLogado();
  exigeAdvogado(contexto);

  const { data } = await contexto.supabase
    .from("lawyer_profiles")
    .select("bio, primary_area, practice_areas, oab_number, oab_state")
    .eq("id", contexto.usuario.id)
    .maybeSingle();

  const bio = String(data?.bio ?? "");
  const principal = String(data?.primary_area ?? "");
  const marcadas = new Set(
    Array.isArray(data?.practice_areas)
      ? (data.practice_areas as string[])
      : [],
  );
  const oab =
    data?.oab_number != null && data?.oab_state != null
      ? `OAB ${String(data.oab_number)}/${String(data.oab_state)}`
      : null;

  return (
      <div className="pagina-de-trabalho">
        <div className="miolo" style={{ maxWidth: 720 }}>
          <h1 style={{ marginTop: 0 }}>Meu perfil profissional</h1>
          <p className="subtitulo">
            É isto que o cliente vê na busca.
            {oab !== null ? ` ${oab}.` : ""}
          </p>

          {erro !== undefined && <p className="erro">{erro}</p>}
          {ok === "bio" && <p className="aviso-bom">Apresentação salva.</p>}
          {ok === "areas" && <p className="aviso-bom">Áreas salvas.</p>}

          <div className="cartao">
            <strong>Apresentação</strong>
            <form action={salvarBio}>
              <label htmlFor="bio">
                Quem você é e como trabalha (até 800 caracteres)
              </label>
              <textarea
                id="bio"
                name="bio"
                rows={6}
                maxLength={800}
                defaultValue={bio}
                placeholder="Ex.: Advogada trabalhista há 12 anos, atendo em Porto Alegre e on-line."
              />
              <button type="submit">Salvar apresentação</button>
            </form>
          </div>

          <div className="cartao" style={{ marginTop: 14 }}>
            <strong>Áreas de atuação</strong>
            <form action={salvarAreas}>
              <label htmlFor="principal">Área principal</label>
              <select
                id="principal"
                name="principal"
                className="seletor"
                defaultValue={principal}
                required
              >
                <option value="" disabled>
                  Escolha a principal
                </option>
                {areasDoDireito.map((area) => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </select>

              <p className="detalhe" style={{ margin: "14px 0 6px" }}>
                Todas as áreas em que você atende (a principal precisa estar
                marcada):
              </p>
              <div className="grade-de-areas">
                {areasDoDireito.map((area) => (
                  <label key={area} className="area-marcavel">
                    <input
                      type="checkbox"
                      name="areas"
                      value={area}
                      defaultChecked={marcadas.has(area)}
                    />
                    {area}
                  </label>
                ))}
              </div>
              <button type="submit">Salvar áreas</button>
            </form>
          </div>
        </div>
      </div>
  );
}
