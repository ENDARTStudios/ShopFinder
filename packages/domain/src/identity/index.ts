/**
 * @workspace/domain/identity
 *
 * Bounded Context: Identity (User authentication)
 *
 * Per Ajuste 2: separate User (authentication identity) from Customer (commerce profile).
 * - User: email, passwordHash, roles. Used by Auth.js for login.
 * - Customer: profile (name, phone, addresses, wishlist). Linked to a User.
 *
 * A single User can be:
 *   - a Customer (role: "customer") → has a Customer profile
 *   - an Admin (role: "admin") → no Customer profile
 *   - a Supplier staff (role: "supplier") → linked to a Supplier
 *
 * Aggregate root: User
 * Events: UserRegistered, UserLoggedIn, UserPasswordChanged, UserRoleAdded
 */

import {
  type UserId,
  type StoreId,
  type CustomerId,
  type SupplierId,
  type EntityId,
  type AggregateRoot,
  type DomainEvent,
  type Result,
  type DomainError,
  asUserId,
  ok,
  err,
  DomainEventBase,
  email,
  type Email
} from "../shared";

export type UserRole = "customer" | "admin" | "supplier" | "support";

// ── Aggregate root: User ────────────────────────────────────

export interface User extends AggregateRoot<"UserId"> {
  readonly email: Email;
  readonly passwordHash: string; // bcrypt/argon2 hash, never plain
  readonly roles: ReadonlyArray<UserRole>;
  readonly storeId?: StoreId; // for tenant-scoped users (customer/support)
  readonly customerId?: CustomerId; // link to Customer profile
  readonly supplierId?: SupplierId; // link to Supplier (for staff)
  readonly status: "active" | "suspended" | "deleted";
  readonly lastLoginAt?: Date;
  readonly emailVerifiedAt?: Date;
}

// ── Domain events ───────────────────────────────────────────

export class UserRegistered extends DomainEventBase {
  constructor(params: { aggregateId: UserId; email: Email; roles: UserRole[] }) {
    super({ ...params, aggregateType: "User", eventType: "user.registered" });
  }
}

export class UserLoggedIn extends DomainEventBase {
  constructor(params: { aggregateId: UserId }) {
    super({ ...params, aggregateType: "User", eventType: "user.logged_in" });
  }
}

export class UserPasswordChanged extends DomainEventBase {
  constructor(params: { aggregateId: UserId }) {
    super({ ...params, aggregateType: "User", eventType: "user.password_changed" });
  }
}

export class UserRoleAdded extends DomainEventBase {
  constructor(params: { aggregateId: UserId; role: UserRole }) {
    super({ ...params, aggregateType: "User", eventType: "user.role_added" });
  }
}

// ── Factory ─────────────────────────────────────────────────

export function registerUser(params: {
  id?: UserId;
  email: string;
  passwordHash: string;
  roles?: UserRole[];
  storeId?: StoreId;
}): Result<User, DomainError> {
  try {
    const id = params.id ?? asUserId(`user_${Date.now()}`);
    const now = new Date();
    const userEmail = email(params.email);
    const roles = params.roles ?? ["customer"];
    const user: User = {
      id,
      email: userEmail,
      passwordHash: params.passwordHash,
      roles,
      storeId: params.storeId,
      status: "active",
      createdAt: now,
      updatedAt: now,
      domainEvents: [new UserRegistered({ aggregateId: id, email: userEmail, roles })],
      markEventsAsCommitted() {}
    };
    return ok(user);
  } catch (e) {
    return err({ code: "USER.INVALID", message: (e as Error).message });
  }
}

export type { EntityId, DomainEvent, Result, DomainError, StoreId, Email };
