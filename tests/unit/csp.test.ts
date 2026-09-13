/**
 * Testes unitários da CSP (#23) — nonce, strict-dynamic e allowlist.
 */
import { describe, expect, test } from "bun:test";
import { buildCsp } from "../../src/lib/csp";

describe("buildCsp", () => {
  test("inclui nonce e strict-dynamic em script-src", () => {
    const csp = buildCsp({ nonce: "abc123", isDev: false });
    expect(csp).toContain("script-src 'self' 'nonce-abc123' 'strict-dynamic'");
  });

  test("produção não inclui unsafe-eval e força upgrade-insecure-requests", () => {
    const csp = buildCsp({ nonce: "x", isDev: false });
    expect(csp).not.toContain("unsafe-eval");
    expect(csp).toContain("upgrade-insecure-requests");
  });

  test("dev inclui unsafe-eval (HMR) e sem upgrade-insecure-requests", () => {
    const csp = buildCsp({ nonce: "x", isDev: true });
    expect(csp).toContain("'unsafe-eval'");
    expect(csp).not.toContain("upgrade-insecure-requests");
  });

  test("allowlist de Stripe e cotação FX no connect/frame", () => {
    const csp = buildCsp({ nonce: "x", isDev: false });
    expect(csp).toContain("https://js.stripe.com");
    expect(csp).toContain("https://api.stripe.com");
    expect(csp).toContain("https://economia.awesomeapi.com.br");
  });

  test("origens extras de connect-src são adicionadas", () => {
    const csp = buildCsp({
      nonce: "x",
      isDev: false,
      extraConnectSrc: ["https://o1.ingest.sentry.io"]
    });
    expect(csp).toContain("https://o1.ingest.sentry.io");
  });

  test("endurecimento base: object-src none, frame-ancestors none", () => {
    const csp = buildCsp({ nonce: "x", isDev: false });
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("base-uri 'self'");
  });
});
