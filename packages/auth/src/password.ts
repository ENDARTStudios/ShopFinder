/**
 * @workspace/auth/password — Password hashing utilities
 *
 * Uses bcryptjs (pure JS, works in all runtimes including Edge).
 * In production, consider argon2 (native, more secure) — the interface
 * is the same, just swap the implementation.
 */

import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  return bcrypt.hash(plain, salt);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}

export async function needsRehash(hash: string): Promise<boolean> {
  // Check if the hash uses fewer rounds than current standard
  const rounds = bcrypt.getRounds(hash);
  return rounds < SALT_ROUNDS;
}
