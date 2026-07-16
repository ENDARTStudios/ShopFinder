/**
 * @workspace/infrastructure/storage/storage.test
 *
 * Tests for ObjectStorage implementations.
 */
/// <reference types="bun-types" />
import { describe, it, expect, beforeEach } from "bun:test";
import { InMemoryObjectStorage, createInMemoryObjectStorage } from "./index";

describe("ObjectStorage", () => {
  let storage: InMemoryObjectStorage;

  beforeEach(() => {
    storage = createInMemoryObjectStorage();
  });

  it("should put and get data", async () => {
    const data = new TextEncoder().encode("test payload");
    const key = await storage.put("raw-records/test", data);
    expect(key).toContain("raw-records/test/");

    const retrieved = await storage.get(key);
    expect(retrieved).toEqual(data);
    expect(new TextDecoder().decode(retrieved)).toBe("test payload");
  });

  it("should check existence", async () => {
    const data = new TextEncoder().encode("exists test");
    const key = await storage.put("test", data);

    expect(await storage.exists(key)).toBe(true);
    expect(await storage.exists("nonexistent/key")).toBe(false);
  });

  it("should delete data", async () => {
    const data = new TextEncoder().encode("delete me");
    const key = await storage.put("test", data);

    expect(await storage.exists(key)).toBe(true);
    const deleted = await storage.delete(key);
    expect(deleted).toBe(true);
    expect(await storage.exists(key)).toBe(false);
  });

  it("should report size", async () => {
    const data = new TextEncoder().encode("size check");
    const key = await storage.put("test", data);

    expect(await storage.size(key)).toBe(data.byteLength);
    expect(await storage.size("nonexistent")).toBe(0);
  });

  it("should throw on get for missing key", async () => {
    expect(storage.get("missing/key")).rejects.toThrow("Key not found");
  });

  it("should handle large payloads", async () => {
    const largeData = new Uint8Array(1024 * 100); // 100KB
    for (let i = 0; i < largeData.length; i++) {
      largeData[i] = i % 256;
    }

    const key = await storage.put("large", largeData);
    const retrieved = await storage.get(key);

    expect(retrieved.byteLength).toBe(largeData.byteLength);
    expect(retrieved[0]).toBe(0);
    expect(retrieved[255]).toBe(255);
    expect(retrieved[256]).toBe(0);
  });

  it("should track count", async () => {
    expect(storage.count).toBe(0);
    await storage.put("a", new Uint8Array([1]));
    await storage.put("b", new Uint8Array([2]));
    expect(storage.count).toBe(2);
    storage.clear();
    expect(storage.count).toBe(0);
  });
});
