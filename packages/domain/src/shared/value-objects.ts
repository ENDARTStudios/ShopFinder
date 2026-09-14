/**
 * @workspace/domain/shared/value-objects
 *
 * Cross-cutting value objects used by multiple bounded contexts.
 * Each VO is immutable, validated at construction, and structurally comparable.
 */

import { type ValueObject, type EntityId, asEntityId } from "./types";

// ── Money ───────────────────────────────────────────────────

export interface Money {
  readonly amount: number; // minor units (cents)
  readonly currency: string; // ISO 4217
}

export function money(amount: number, currency: string): Money {
  if (!Number.isInteger(amount)) {
    throw new RangeError(`Money amount must be an integer (minor units): ${amount}`);
  }
  if (amount < 0) {
    throw new RangeError(`Money amount cannot be negative: ${amount}`);
  }
  const cur = currency.toUpperCase();
  if (cur.length !== 3) {
    throw new RangeError(`Currency must be ISO 4217 (3 letters): ${currency}`);
  }
  return { amount, currency: cur };
}

export function addMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new TypeError(`Currency mismatch: ${a.currency} vs ${b.currency}`);
  }
  return money(a.amount + b.amount, a.currency);
}

export function subtractMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new TypeError(`Currency mismatch: ${a.currency} vs ${b.currency}`);
  }
  return money(a.amount - b.amount, a.currency);
}

export function multiplyMoney(m: Money, factor: number): Money {
  return money(Math.round((m.amount * factor) / 100) * 100, m.currency);
}

// ── Email ───────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface Email {
  readonly value: string;
}

export function email(value: string): Email {
  const lower = value.trim().toLowerCase();
  if (!EMAIL_RE.test(lower)) {
    throw new RangeError(`Invalid email: ${value}`);
  }
  return { value: lower };
}

// ── Address ─────────────────────────────────────────────────

export interface Address {
  readonly line1: string;
  readonly line2?: string;
  readonly city: string;
  readonly state?: string;
  readonly postalCode: string;
  readonly country: string; // ISO 3166-1 alpha-2
}

export function address(a: {
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
}): Address {
  if (!a.line1?.trim()) throw new RangeError("Address line1 is required");
  if (!a.city?.trim()) throw new RangeError("Address city is required");
  if (!a.postalCode?.trim()) throw new RangeError("Address postalCode is required");
  if (a.country.length !== 2) throw new RangeError("Address country must be ISO 3166-1 alpha-2");
  return {
    line1: a.line1.trim(),
    line2: a.line2?.trim() || undefined,
    city: a.city.trim(),
    state: a.state?.trim() || undefined,
    postalCode: a.postalCode.trim(),
    country: a.country.toUpperCase()
  };
}

// ── Quantity ────────────────────────────────────────────────

export interface Quantity {
  readonly value: number;
}

export function quantity(value: number): Quantity {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`Quantity must be a non-negative integer: ${value}`);
  }
  return { value };
}

// ── Percentage ──────────────────────────────────────────────

export interface Percentage {
  readonly value: number; // 0-100
}

export function percentage(value: number): Percentage {
  if (value < 0 || value > 100) {
    throw new RangeError(`Percentage must be 0-100: ${value}`);
  }
  return { value: Math.round(value * 100) / 100 };
}

// ── DateRange ───────────────────────────────────────────────

export interface DateRange {
  readonly start: Date;
  readonly end: Date;
}

export function dateRange(start: Date, end: Date): DateRange {
  if (end < start) {
    throw new RangeError(
      `DateRange end before start: ${end.toISOString()} < ${start.toISOString()}`
    );
  }
  return { start, end };
}

// ── Slug ────────────────────────────────────────────────────

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export interface Slug {
  readonly value: string;
}

export function slug(value: string): Slug {
  const lower = value.trim().toLowerCase();
  if (!SLUG_RE.test(lower)) {
    throw new RangeError(`Invalid slug: ${value}`);
  }
  return { value: lower };
}

// ── Re-export EntityId helpers for convenience ──────────────
export type { EntityId } from "./types";
export { asEntityId } from "./types";
