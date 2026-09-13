/**
 * Testes unitários do TOTP (#22) — vetores RFC 6238 (SHA1) + janela e URI.
 */
import { describe, expect, test } from "bun:test";
import {
  generateTotpSecret,
  base32Decode,
  totpAt,
  verifyTotp,
  otpauthUri
} from "../../packages/auth/src/totp";

// RFC 6238 Appendix B — secret ASCII "12345678901234567890" (20 bytes)
const RFC_SECRET_ASCII = "12345678901234567890";
const RFC_VECTORS: Array<[number, string]> = [
  [59_000, "287082"], // T=59 → 94287082 (8 dígitos) → 287082 (6)
  [1_111_111_109_000, "081804"],
  [1_111_111_111_000, "050471"],
  [1_234_567_890_000, "005924"],
  [2_000_000_000_000, "279037"],
  [20_000_000_000_000, "353130"]
];

// Converte ASCII para base32 (mesma tabela do alfabeto)

describe("TOTP — vetores RFC 6238", () => {
  // Reimplementação leve: codifica bytes do secret ASCII direto para base32
  function toBase32(bytes: Buffer): string {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let bits = 0;
    let value = 0;
    let out = "";
    for (const byte of bytes) {
      value = (value << 8) | byte;
      bits += 8;
      while (bits >= 5) {
        out += alphabet[(value >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }
    if (bits > 0) out += alphabet[(value << (5 - bits)) & 31];
    return out;
  }

  for (const [timeMs, expected] of RFC_VECTORS) {
    test(`T=${timeMs / 1000}s → ${expected}`, () => {
      const secret = toBase32(Buffer.from(RFC_SECRET_ASCII, "ascii"));
      expect(totpAt(secret, timeMs)).toBe(expected);
    });
  }
});

describe("verifyTotp", () => {
  const secret = generateTotpSecret();
  const now = 1_700_000_000_000;

  test("código atual é aceito", () => {
    expect(verifyTotp(secret, totpAt(secret, now), now)).toBe(true);
  });

  test("código de 30s atrás é aceito (janela ±1)", () => {
    expect(verifyTotp(secret, totpAt(secret, now - 30_000), now)).toBe(true);
  });

  test("código de 90s atrás é rejeitado (fora da janela)", () => {
    expect(verifyTotp(secret, totpAt(secret, now - 90_000), now)).toBe(false);
  });

  test("código de outro secret é rejeitado", () => {
    expect(verifyTotp(generateTotpSecret(), totpAt(secret, now), now)).toBe(false);
  });

  test("formato inválido é rejeitado sem lançar", () => {
    expect(verifyTotp(secret, "12345", now)).toBe(false);
    expect(verifyTotp(secret, "abcdef", now)).toBe(false);
    expect(verifyTotp(secret, "", now)).toBe(false);
  });
});

describe("base32", () => {
  test("decode(roundtrip) recupera os bytes", () => {
    const secret = generateTotpSecret();
    const decoded = base32Decode(secret);
    expect(decoded.length).toBe(20);
  });

  test("caractere inválido lança", () => {
    expect(() => base32Decode("ABC1")).toThrow();
  });
});

describe("otpauthUri", () => {
  test("formato com issuer e email", () => {
    const uri = otpauthUri({ secret: "JBSWY3DPEHPK3PXP", email: "a@b.com" });
    expect(uri).toContain("otpauth://totp/ShopFinder:a%40b.com");
    expect(uri).toContain("secret=JBSWY3DPEHPK3PXP");
    expect(uri).toContain("digits=6");
    expect(uri).toContain("period=30");
  });
});
