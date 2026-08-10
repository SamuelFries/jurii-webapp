import { beforeAll, describe, expect, test } from "vitest";

import { urlDoAvatar } from "./avatar";

const origem = "https://rlgtgipxltucrtkyrmag.supabase.co";
const uuid = "123e4567-e89b-12d3-a456-426614174000";

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = origem;
});

describe("url do avatar", () => {
  test("URL completa de OUTRO host é reprefixada para o projeto atual", () => {
    // O defeito real: valores gravados em outra época apontavam para outro
    // host, e caminho relativo dava 404 silencioso na web.
    const antiga = `https://projeto-velho.supabase.co/storage/v1/object/public/profile-avatars/${uuid}/foto.jpg`;
    expect(urlDoAvatar(antiga)).toBe(
      `${origem}/storage/v1/object/public/profile-avatars/${uuid}/foto.jpg`,
    );
  });

  test("avatar de escritório usa o marcador e o formato próprios", () => {
    const caminho = `${uuid}/${uuid}/logo.png`;
    expect(
      urlDoAvatar(`/storage/v1/object/public/law-firm-avatars/${caminho}`),
    ).toBe(`${origem}/storage/v1/object/public/law-firm-avatars/${caminho}`);
  });

  test("sem marcador não inventa URL: cai nas iniciais", () => {
    expect(urlDoAvatar(`${uuid}/foto.jpg`)).toBeNull();
    expect(urlDoAvatar(null)).toBeNull();
    expect(urlDoAvatar("")).toBeNull();
  });

  test("caminho fora do formato é recusado (não vira URL para lugar nenhum)", () => {
    expect(
      urlDoAvatar(`/storage/v1/object/public/profile-avatars/../../etc/passwd`),
    ).toBeNull();
    expect(
      urlDoAvatar(`/storage/v1/object/public/profile-avatars/semuuid.jpg`),
    ).toBeNull();
  });

  test("querystring e fragmento são descartados como no app", () => {
    expect(
      urlDoAvatar(
        `/storage/v1/object/public/profile-avatars/${uuid}/foto.jpg?t=123#x`,
      ),
    ).toBe(`${origem}/storage/v1/object/public/profile-avatars/${uuid}/foto.jpg`);
  });
});
