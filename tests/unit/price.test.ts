/**
 * Testes unitários da matemática de dinheiro (#28) — meta 90% (docs/eng/TESTING.md).
 */
import { describe, expect, test } from "bun:test";
import {
  minorUnitsToNumber,
  computePriceRange,
  formatMoney
} from "../../src/lib/price";

describe("minorUnitsToNumber", () => {
  test("converte centavos para decimal", () => {
    expect(minorUnitsToNumber(1999n)).toBe(19.99);
    expect(minorUnitsToNumber(100n)).toBe(1);
    expect(minorUnitsToNumber(0n)).toBe(0);
  });

  test("valores grandes não perdem precisão de centavos", () => {
    expect(minorUnitsToNumber(123456789n)).toBe(1234567.89);
  });
});

describe("computePriceRange", () => {
  test("sem ofertas usa o preço base", () => {
    expect(computePriceRange([], 42.5)).toEqual({
      min: 42.5,
      max: 42.5,
      fromOffers: false
    });
  });

  test("com ofertas retorna min/max reais", () => {
    const r = computePriceRange([10.5, 8.99, 12.0], 9.0);
    expect(r.min).toBe(8.99);
    expect(r.max).toBe(12.0);
    expect(r.fromOffers).toBe(true);
  });

  test("oferta única tem min = max", () => {
    const r = computePriceRange([7.77], 9.99);
    expect(r.min).toBe(r.max);
    expect(r.min).toBe(7.77);
  });
});

describe("formatMoney", () => {
  test("formata em pt-BR", () => {
    expect(formatMoney(1234.5, "BRL")).toContain("1.234,50");
  });

  test("moeda padrão USD", () => {
    expect(formatMoney(19.99)).toContain("19,99");
  });
});
