/**
 * ShopFinder — TOTP (RFC 6238) server-side (#22)
 *
 * Implementação própria com node:crypto (HMAC-SHA1, 6 dígitos, passo 30s)
 * — sem dependência externa. Ver docs/eng/RBAC.md (MFA para roles admin).
 */
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const STEP_SECONDS = 30;
const DIGITS = 6;
/** Janela de tolerância: ±1 passo (30s) para drift de relógio. */
const DEFAULT_WINDOW = 1;

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** Secret base32 (RFC 4648) — padrão de interoperabilidade com apps TOTP. */
export function generateTotpSecret(bytes = 20): string {
  const buf = randomBytes(bytes);
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

export function base32Decode(secret: string): Buffer {
  const clean = secret.replace(/=+$/, "").replace(/\s/g, "").toUpperCase();
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of clean) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) throw new Error("caractere inválido no secret base32");
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/** HOTP (RFC 4226) — contador usado pelo TOTP como nº de passos de 30s. */
function hotp(key: Buffer, counter: number): string {
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  counterBuf.writeUInt32BE(counter % 0x100000000, 4);

  const digest = createHmac("sha1", key).update(counterBuf).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);
  return (binary % 10 ** DIGITS).toString().padStart(DIGITS, "0");
}

/** TOTP no instante `nowMs` (injetável para testes). */
export function totpAt(secret: string, nowMs: number = Date.now()): string {
  const counter = Math.floor(nowMs / 1000 / STEP_SECONDS);
  return hotp(base32Decode(secret), counter);
}

/** Comparação à prova de timing. */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Verifica o código com janela de ±`window` passos.
 * Retorna true apenas com match exato (dígito a dígito) em algum passo válido.
 */
export function verifyTotp(
  secret: string,
  code: string,
  nowMs: number = Date.now(),
  window: number = DEFAULT_WINDOW
): boolean {
  if (!/^\d{6}$/.test(code)) return false;
  const counter = Math.floor(nowMs / 1000 / STEP_SECONDS);
  const key = base32Decode(secret);
  for (let drift = -window; drift <= window; drift++) {
    if (safeEqual(hotp(key, counter + drift), code)) return true;
  }
  return false;
}

/** URI otpauth para enrollment em apps (Google Authenticator etc.). */
export function otpauthUri(params: { secret: string; email: string; issuer?: string }): string {
  const issuer = (params.issuer ?? "ShopFinder").replace(/:/g, "");
  // Label "issuer:account" — dois-pontos literal, e-mail percent-encoded
  const label = `${issuer}:${encodeURIComponent(params.email)}`;
  return `otpauth://totp/${label}?secret=${params.secret}&issuer=${encodeURIComponent(
    issuer
  )}&algorithm=SHA1&digits=${DIGITS}&period=${STEP_SECONDS}`;
}
