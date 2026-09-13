/**
 * Testes unitários do fx-core (#28) — parsing de cotação e cache TTL.
 */
import { describe, expect, test } from "bun:test";
import {
  parseUsdBrlBid,
  isCacheEntryValid,
  FX_TTL_MS,
  FX_FALLBACK_RATE
} from "../../src/lib/fx-core";

describe("parseUsdBrlBid", () => {
  test("extrai bid numérico do payload da awesomeapi", () => {
    expect(parseUsdBrlBid({ USDBRL: { bid: 5.4321 } })).toBe(5.4321);
  });

  test("bid string é convertida", () => {
    expect(parseUsdBrlBid({ USDBRL: { bid: "5.4321" } })).toBe(5.4321);
  });

  test("payload sem USDBRL retorna null", () => {
    expect(parseUsdBrlBid({})).toBeNull();
    expect(parseUsdBrlBid({ USDBRL: null })).toBeNull();
  });

  test("bid inválido (NaN, <= 0) retorna null", () => {
    expect(parseUsdBrlBid({ USDBRL: { bid: "abc" } })).toBeNull();
    expect(parseUsdBrlBid({ USDBRL: { bid: 0 } })).toBeNull();
    expect(parseUsdBrlBid({ USDBRL: { bid: -1 } })).toBeNull();
  });

  test("null/undefined/primitivos retornam null sem lançar", () => {
    expect(parseUsdBrlBid(null)).toBeNull();
    expect(parseUsdBrlBid(undefined)).toBeNull();
    expect(parseUsdBrlBid("USDBRL")).toBeNull();
  });
});

describe("isCacheEntryValid", () => {
  const now = 1_000_000_000;

  test("entrada fresca é válida", () => {
    expect(isCacheEntryValid({ rate: 5.5, ts: now - 1000 }, now)).toBe(true);
  });

  test("entrada expirada (além do TTL de 1h) é inválida", () => {
    expect(isCacheEntryValid({ rate: 5.5, ts: now - FX_TTL_MS - 1 }, now)).toBe(false);
    expect(isCacheEntryValid({ rate: 5.5, ts: now - FX_TTL_MS }, now)).toBe(true);
  });

  test("tipos incorretos são inválidos", () => {
    expect(isCacheEntryValid(null, now)).toBe(false);
    expect(isCacheEntryValid("5.5", now)).toBe(false);
    expect(isCacheEntryValid({ rate: "5.5", ts: now }, now)).toBe(false);
    expect(isCacheEntryValid({ rate: 5.5 }, now)).toBe(false);
  });

  test("rate não positivo é inválido", () => {
    expect(isCacheEntryValid({ rate: 0, ts: now }, now)).toBe(false);
    expect(isCacheEntryValid({ rate: -1, ts: now }, now)).toBe(false);
  });
});

describe("constantes", () => {
  test("fallback é a taxa de contingência documentada", () => {
    expect(FX_FALLBACK_RATE).toBe(5.5);
  });
});
