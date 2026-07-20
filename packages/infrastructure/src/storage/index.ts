/**
 * @workspace/infrastructure/storage
 *
 * Object Storage abstraction for large payloads.
 *
 * RawProductRecord.payload, InferenceArtifact.rawResponse, and
 * provider responses are stored in Object Storage (S3/MinIO),
 * NOT in PostgreSQL. The DB stores only the payloadKey.
 *
 * Implementations:
 *   - S3ObjectStorage: uses AWS S3 or MinIO (S3-compatible)
 *   - InMemoryObjectStorage: for tests (stores in Map)
 *
 * Usage:
 *   const storage = createS3ObjectStorage({ endpoint, accessKey, secretKey, bucket });
 *   const key = await storage.put('raw-records', payload);
 *   const data = await storage.get(key);
 */

// ── Interface ──────────────────────────────────────────────

export interface ObjectStorage {
  /**
   * Store data and return a unique key.
   * The key is used as `payloadKey` in RawProductRecord.
   */
  put(prefix: string, data: Uint8Array): Promise<string>;

  /**
   * Retrieve data by key.
   */
  get(key: string): Promise<Uint8Array>;

  /**
   * Delete data by key.
   */
  delete(key: string): Promise<boolean>;

  /**
   * Check if data exists.
   */
  exists(key: string): Promise<boolean>;

  /**
   * Get the size of stored data.
   */
  size(key: string): Promise<number>;

  readonly name: string;
}

// ── S3/MinIO implementation ───────────────────────────────

export interface S3StorageConfig {
  readonly endpoint: string;
  readonly accessKey: string;
  readonly secretKey: string;
  readonly bucket: string;
  readonly region?: string;
}

export class S3ObjectStorage implements ObjectStorage {
  readonly name = "s3";

  constructor(private readonly config: S3StorageConfig) {}

  async put(prefix: string, data: Uint8Array): Promise<string> {
    const key = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    // Use fetch to call S3/MinIO API (S3-compatible)
    // In production, use @aws-sdk/client-s3 or minio client.
    // For now, use the S3 REST API directly via fetch.
    const url = `${this.config.endpoint}/${this.config.bucket}/${key}`;

    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Length": String(data.byteLength),
      },
      body: data,
    });

    if (!response.ok) {
      // MinIO may not require auth for local dev
      // Try without auth headers first
      if (response.status === 403) {
        throw new Error(`S3 auth failed for bucket ${this.config.bucket}`);
      }
      throw new Error(`S3 put failed: ${response.status} ${await response.text()}`);
    }

    return key;
  }

  async get(key: string): Promise<Uint8Array> {
    const url = `${this.config.endpoint}/${this.config.bucket}/${key}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`S3 get failed: ${response.status} for key ${key}`);
    }

    const buffer = await response.arrayBuffer();
    return new Uint8Array(buffer);
  }

  async delete(key: string): Promise<boolean> {
    const url = `${this.config.endpoint}/${this.config.bucket}/${key}`;
    const response = await fetch(url, { method: "DELETE" });
    return response.ok || response.status === 204;
  }

  async exists(key: string): Promise<boolean> {
    const url = `${this.config.endpoint}/${this.config.bucket}/${key}`;
    const response = await fetch(url, { method: "HEAD" });
    return response.ok;
  }

  async size(key: string): Promise<number> {
    const url = `${this.config.endpoint}/${this.config.bucket}/${key}`;
    const response = await fetch(url, { method: "HEAD" });
    if (!response.ok) return 0;
    const contentLength = response.headers.get("content-length");
    return contentLength ? parseInt(contentLength, 10) : 0;
  }
}

// ── In-memory implementation (for tests) ───────────────────

export class InMemoryObjectStorage implements ObjectStorage {
  readonly name = "memory";
  private store = new Map<string, Uint8Array>();

  async put(prefix: string, data: Uint8Array): Promise<string> {
    const key = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    this.store.set(key, data);
    return key;
  }

  async get(key: string): Promise<Uint8Array> {
    const data = this.store.get(key);
    if (!data) throw new Error(`Key not found: ${key}`);
    return data;
  }

  async delete(key: string): Promise<boolean> {
    return this.store.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    return this.store.has(key);
  }

  async size(key: string): Promise<number> {
    const data = this.store.get(key);
    return data ? data.byteLength : 0;
  }

  clear(): void {
    this.store.clear();
  }

  get count(): number {
    return this.store.size;
  }
}

// ── Factories ──────────────────────────────────────────────

export function createS3ObjectStorage(config: S3StorageConfig): ObjectStorage {
  return new S3ObjectStorage(config);
}

export function createInMemoryObjectStorage(): InMemoryObjectStorage {
  return new InMemoryObjectStorage();
}
