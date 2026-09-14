/**
 * Testes unitários do RBAC (#24) — modelo de permissões do @workspace/application.
 */
import { describe, expect, test } from "bun:test";
import {
  resolvePermissions,
  PermissionChecker,
  requirePermission
} from "../../packages/application/src/authorization";

describe("resolvePermissions", () => {
  test("operator tem permissões de operação sem gestão de usuários", () => {
    const perms = resolvePermissions(["operator"]);
    expect(perms).toContain("catalog.write");
    expect(perms).toContain("supplier.connect");
    expect(perms).not.toContain("admin.users");
    expect(perms).not.toContain("admin.settings");
  });

  test("admin tem todas as permissões administrativas", () => {
    const perms = resolvePermissions(["admin"]);
    expect(perms).toContain("admin.access");
    expect(perms).toContain("admin.users");
    expect(perms).toContain("payment.refund");
  });

  test("roles acumulam permissões (união)", () => {
    const perms = resolvePermissions(["customer", "support"]);
    expect(perms).toContain("order.read.self"); // do customer
    expect(perms).toContain("order.cancel"); // do support
  });

  test("role desconhecida não concede nada", () => {
    expect(resolvePermissions(["hacker"])).toEqual([]);
  });

  test("customer não escreve no catálogo", () => {
    expect(resolvePermissions(["customer"])).not.toContain("catalog.write");
  });
});

describe("PermissionChecker", () => {
  const ctx = (roles: string[]) => ({
    auth: {
      roles,
      permissions: resolvePermissions(roles),
      isAuthenticated: roles.length > 0,
      userId: "u1",
      customerId: null
    }
  });

  test("can verifica permissão individual", () => {
    const checker = PermissionChecker.forContext(ctx(["operator"]) as never);
    expect(checker.can("catalog.delete")).toBe(true);
    expect(checker.can("admin.users")).toBe(false);
  });

  test("canAny aceita qualquer uma das permissões", () => {
    const checker = PermissionChecker.forContext(ctx(["support"]) as never);
    expect(checker.canAny(["catalog.write", "order.read"])).toBe(true);
    expect(checker.canAny(["catalog.write", "admin.users"])).toBe(false);
  });

  test("requirePermission respeita o contexto", () => {
    expect(requirePermission(ctx(["admin"]) as never, "admin.settings")).toBe(true);
    expect(requirePermission(ctx(["operator"]) as never, "admin.settings")).toBe(false);
  });
});
