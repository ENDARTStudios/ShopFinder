/**
 * @workspace/domain/specifications
 *
 * Specification pattern — encapsulates business rules that can be composed
 * (AND, OR, NOT) and tested against domain objects. Useful for preconditions
 * (can this cart be checked out?) and queries (find all available products
 * that ship to country X).
 *
 * Interfaces only. Implementations live with the relevant bounded context
 * or application service.
 */

import type { Result, DomainError } from "../shared";
import type { Cart } from "../cart";
import type { Product, Variant } from "../catalog";
import type { CheckoutSession } from "../checkout";
import type { Supplier } from "../supplier";

// ── Base interface ──────────────────────────────────────────

export interface Specification<T> {
  /** Test if the candidate satisfies the specification. */
  isSatisfiedBy(candidate: T): boolean;
  /** Return a Result with the reason if not satisfied (for user-facing errors). */
  check(candidate: T): Result<true, DomainError>;
  and(other: Specification<T>): Specification<T>;
  or(other: Specification<T>): Specification<T>;
  not(): Specification<T>;
}

// ── Concrete specifications (interfaces) ────────────────────

/**
 * A cart can be checked out if:
 *  - it has at least one item
 *  - all items are in stock
 *  - the currency is supported
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface CanCheckoutSpecification extends Specification<Cart> {}

/**
 * A product is available if:
 *  - status === "published"
 *  - at least one variant has inventory > 0
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ProductAvailableSpecification extends Specification<Product> {}

/**
 * A supplier supports shipping to a country if:
 *  - it's active
 *  - the country is in its supported destinations
 */

export interface SupplierSupportsCountrySpecification extends Specification<Supplier> {
  readonly countryCode: string;
}

/**
 * A checkout session is completable if:
 *  - shipping address is set
 *  - billing address is set
 *  - shipping method is selected
 *  - status is "billing_set"
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface CanCompleteCheckoutSpecification extends Specification<CheckoutSession> {}

// ── Combinator helpers (base class) ──────────────────────────

export abstract class BaseSpecification<T> implements Specification<T> {
  abstract isSatisfiedBy(candidate: T): boolean;
  abstract check(candidate: T): Result<true, DomainError>;

  and(other: Specification<T>): Specification<T> {
    return new AndSpecification(this, other);
  }
  or(other: Specification<T>): Specification<T> {
    return new OrSpecification(this, other);
  }
  not(): Specification<T> {
    return new NotSpecification(this);
  }
}

class AndSpecification<T> extends BaseSpecification<T> {
  constructor(
    private readonly a: Specification<T>,
    private readonly b: Specification<T>
  ) {
    super();
  }
  isSatisfiedBy(c: T): boolean {
    return this.a.isSatisfiedBy(c) && this.b.isSatisfiedBy(c);
  }
  check(c: T): Result<true, DomainError> {
    const ra = this.a.check(c);
    if (!ra.ok) return ra;
    return this.b.check(c);
  }
}

class OrSpecification<T> extends BaseSpecification<T> {
  constructor(
    private readonly a: Specification<T>,
    private readonly b: Specification<T>
  ) {
    super();
  }
  isSatisfiedBy(c: T): boolean {
    return this.a.isSatisfiedBy(c) || this.b.isSatisfiedBy(c);
  }
  check(c: T): Result<true, DomainError> {
    if (this.a.isSatisfiedBy(c) || this.b.isSatisfiedBy(c))
      return { ok: true, value: true as const };
    return { ok: false, error: { code: "SPEC.OR_FAILED", message: "Neither condition satisfied" } };
  }
}

class NotSpecification<T> extends BaseSpecification<T> {
  constructor(private readonly inner: Specification<T>) {
    super();
  }
  isSatisfiedBy(c: T): boolean {
    return !this.inner.isSatisfiedBy(c);
  }
  check(c: T): Result<true, DomainError> {
    if (this.inner.isSatisfiedBy(c)) {
      return {
        ok: false,
        error: { code: "SPEC.NOT_FAILED", message: "Condition was satisfied (expected NOT)" }
      };
    }
    return { ok: true, value: true as const };
  }
}

export type { Result, DomainError, Cart, Product, Variant, CheckoutSession, Supplier };
