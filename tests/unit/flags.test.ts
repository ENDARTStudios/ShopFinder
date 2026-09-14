/**
 * Testes unitários das feature flags (#35 / #28).
 */
import { describe, expect, test } from "bun:test";
import { featureFlags, isFlagEnabled } from "../../packages/config/src/flags";

describe("feature flags", () => {
  test("defaults: flags críticas desligadas, operacionais ligadas", () => {
    expect(featureFlags.rls_enforcement).toBe(false);
    expect(featureFlags.mfa_admin).toBe(false);
    expect(featureFlags.fx_live_quotes).toBe(true);
  });

  test("isFlagEnabled retorna o default sem overrides", () => {
    expect(isFlagEnabled("compare_v2")).toBe(false);
  });

  test("override por loja vence o default", () => {
    expect(isFlagEnabled("compare_v2", { compare_v2: true })).toBe(true);
    expect(isFlagEnabled("fx_live_quotes", { fx_live_quotes: false })).toBe(false);
  });

  test("override parcial preserva os demais defaults", () => {
    expect(isFlagEnabled("mfa_admin", { compare_v2: true })).toBe(false);
  });
});
