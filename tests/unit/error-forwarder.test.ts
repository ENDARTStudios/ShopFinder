/**
 * Testes unitários do registry de forwarder de erros (#25).
 */
import { describe, expect, test, beforeEach } from "bun:test";
import { setErrorForwarder, forwardError } from "../../src/lib/error-forwarder";

describe("error-forwarder", () => {
  beforeEach(() => {
    setErrorForwarder(null);
  });

  test("forwarder registrado recebe erro e contexto", () => {
    const seen: Array<{ error: unknown; context: Record<string, unknown> }> = [];
    setErrorForwarder((error, context) => seen.push({ error, context }));

    forwardError(new Error("boom"), { route: "/api/x" });

    expect(seen).toHaveLength(1);
    expect((seen[0].error as Error).message).toBe("boom");
    expect(seen[0].context.route).toBe("/api/x");
  });

  test("sem forwarder registrado não lança", () => {
    expect(() => forwardError(new Error("nada"), {})).not.toThrow();
  });

  test("forwarder que lança não propaga", () => {
    setErrorForwarder(() => {
      throw new Error("adapter quebrado");
    });
    expect(() => forwardError(new Error("original"), {})).not.toThrow();
  });

  test("último forwarder registrado vence", () => {
    const calls: string[] = [];
    setErrorForwarder(() => calls.push("primeiro"));
    setErrorForwarder(() => calls.push("segundo"));

    forwardError(new Error("x"), {});
    expect(calls).toEqual(["segundo"]);
  });
});
