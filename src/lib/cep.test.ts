import { describe, expect, test } from "vitest";

import {
  cepValido,
  consultaDoNominatim,
  decideCoordenada,
  digitosDoCep,
  enderecoEmUmaLinha,
  leAwesomeApi,
  leBrasilApi,
  leNominatim,
  precisaGeocodificar,
  temNumero,
} from "./cep";

describe("leitura das três fontes", () => {
  test("BrasilAPI: endereço, e a coordenada vazia que motivou a cascata", () => {
    const endereco = leBrasilApi(
      JSON.stringify({
        cep: "90540140",
        street: "Rua Germano Petersen Júnior",
        neighborhood: "Auxiliadora",
        city: "Porto Alegre",
        state: "RS",
        location: { type: "Point", coordinates: {} },
      }),
    );
    expect(endereco?.cidade).toBe("Porto Alegre");
    // O campo vem VAZIO em produção: é por isso que existe a cascata.
    expect(endereco?.coordenada).toBeNull();
  });

  test("AwesomeAPI usa lat/lng como string; Nominatim usa lat/lon em lista", () => {
    expect(leAwesomeApi(JSON.stringify({ lat: "-30.02", lng: "-51.19" }))).toEqual(
      { latitude: -30.02, longitude: -51.19 },
    );
    expect(leNominatim(JSON.stringify([{ lat: "-30.02", lon: "-51.19" }]))).toEqual(
      { latitude: -30.02, longitude: -51.19 },
    );
    expect(leNominatim("[]")).toBeNull();
  });

  test("lixo e zero-zero não viram coordenada", () => {
    expect(leAwesomeApi("não é json")).toBeNull();
    expect(leAwesomeApi(JSON.stringify({ lat: "0", lng: "0" }))).toBeNull();
    expect(leBrasilApi(JSON.stringify({ erro: true }))).toBeNull();
  });
});

describe("consulta do Nominatim", () => {
  const endereco = {
    cep: "90540140",
    rua: "Rua Germano Petersen Júnior",
    bairro: "Auxiliadora",
    cidade: "Porto Alegre",
    uf: "RS",
    coordenada: null,
  };

  test("o número vem ANTES do logradouro, ou o Nominatim o ignora", () => {
    const consulta = new URLSearchParams(
      consultaDoNominatim("90540140", endereco, "70"),
    );
    expect(consulta.get("street")).toBe("70 Rua Germano Petersen Júnior");
    expect(consulta.get("city")).toBe("Porto Alegre");
    expect(consulta.get("state")).toBe("RS");
  });

  test("sem número, só o logradouro; sem endereço, cai para o CEP", () => {
    expect(
      new URLSearchParams(consultaDoNominatim("90540140", endereco, "s/n")).get(
        "street",
      ),
    ).toBe("Rua Germano Petersen Júnior");
    const semRua = new URLSearchParams(
      consultaDoNominatim("90540140", null, null),
    );
    expect(semRua.get("postalcode")).toBe("90540140");
    expect(semRua.get("street")).toBeNull();
  });
});

describe("quando geocodificar", () => {
  const base = {
    cepNovo: "90540140",
    cepAntigo: "90540140",
    numeroNovo: "70",
    numeroAntigo: "70",
    coordenadaAtual: { latitude: -30, longitude: -51 },
  };

  test("nada mudou e já há coordenada: não gasta chamada", () => {
    expect(precisaGeocodificar(base)).toBe(false);
  });

  test("CEP novo, número novo, ou coordenada ausente: geocodifica", () => {
    expect(precisaGeocodificar({ ...base, cepNovo: "01310100" })).toBe(true);
    expect(precisaGeocodificar({ ...base, numeroNovo: "1200" })).toBe(true);
    // Os 39 de 40 escritórios com CEP e sem coordenada dependem deste ramo.
    expect(precisaGeocodificar({ ...base, coordenadaAtual: null })).toBe(true);
  });

  test("CEP incompleto não vira chamada", () => {
    expect(precisaGeocodificar({ ...base, cepNovo: "905401" })).toBe(false);
  });
});

describe("a regra da coordenada ao salvar", () => {
  const atual = { latitude: -30, longitude: -51 };
  const nova = { latitude: -23, longitude: -46 };

  test("sem CEP, a coordenada MORRE (órfã plotaria no lugar errado)", () => {
    expect(
      decideCoordenada({
        cepNovo: "",
        cepAntigo: "90540140",
        numeroNovo: "",
        numeroAntigo: "70",
        coordenadaAtual: atual,
        buscada: null,
        buscou: false,
      }),
    ).toBeNull();
  });

  test("achou: vale a nova", () => {
    expect(
      decideCoordenada({
        cepNovo: "01310100",
        cepAntigo: "90540140",
        numeroNovo: "1200",
        numeroAntigo: "70",
        coordenadaAtual: atual,
        buscada: nova,
        buscou: true,
      }),
    ).toEqual(nova);
  });

  test("CEP MUDOU e a busca falhou: morre, para não plotar de onde saiu", () => {
    expect(
      decideCoordenada({
        cepNovo: "01310100",
        cepAntigo: "90540140",
        numeroNovo: "1200",
        numeroAntigo: "70",
        coordenadaAtual: atual,
        buscada: null,
        buscou: true,
      }),
    ).toBeNull();
  });

  test("CEP IGUAL e a busca falhou: fica como estava, tenta na próxima", () => {
    expect(
      decideCoordenada({
        cepNovo: "90540140",
        cepAntigo: "90540140",
        numeroNovo: "70",
        numeroAntigo: "70",
        coordenadaAtual: atual,
        buscada: null,
        buscou: true,
      }),
    ).toEqual(atual);
  });
});

describe("utilidades", () => {
  test("máscara e validação de CEP", () => {
    expect(digitosDoCep("90540-140")).toBe("90540140");
    expect(cepValido("90540-140")).toBe(true);
    expect(cepValido("9054")).toBe(false);
  });

  test("número precisa de dígito; endereço numa linha", () => {
    expect(temNumero("s/n")).toBe(false);
    expect(temNumero("70")).toBe(true);
    expect(
      enderecoEmUmaLinha({
        cep: "1",
        rua: "Rua X",
        bairro: "Centro",
        cidade: "Porto Alegre",
        uf: "RS",
        coordenada: null,
      }),
    ).toBe("Rua X, Centro, Porto Alegre - RS");
  });
});
