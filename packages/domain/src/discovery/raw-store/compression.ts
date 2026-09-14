/**
 * @workspace/domain/discovery/raw-store/compression
 *
 * Compressor interface for raw payload storage.
 *
 * Design: the domain layer defines the interface and a NoopCompressor
 * (UTF-8 bytes, no compression). The infrastructure layer (@workspace/database)
 * provides a GzipCompressor backed by Node's zlib.
 *
 * Why compress? The user's design principle: "Grave exatamente o payload
 * recebido. gzip/zstd. Porque daqui alguns meses você pode querer reprocessar
 * usando IA melhor." Compression keeps storage costs manageable while
 * preserving the exact original payload for future reprocessing.
 */

export interface Compressor {
  /** Compress a string into bytes. */
  compress(data: string): Uint8Array | Promise<Uint8Array>;
  /** Decompress bytes back into the original string. */
  decompress(data: Uint8Array): string | Promise<string>;
  /** Algorithm name for audit/metrics. */
  readonly algorithm: string;
}

/**
 * No-op compressor — stores UTF-8 bytes without compression.
 * Default for dev/test. Production should swap in GzipCompressor.
 */
export class NoopCompressor implements Compressor {
  readonly algorithm = "noop";
  private readonly encoder = new TextEncoder();
  private readonly decoder = new TextDecoder();

  compress(data: string): Uint8Array {
    return this.encoder.encode(data);
  }

  decompress(data: Uint8Array): string {
    return this.decoder.decode(data);
  }
}

/**
 * Gzip compressor — backed by Node's zlib.
 * Uses dynamic import to avoid `require()` (lint rule) and to keep
 * the module importable in non-Node contexts for type checking.
 * The first compress/decompress call triggers the import; subsequent
 * calls use the cached module.
 */
export class GzipCompressor implements Compressor {
  readonly algorithm = "gzip";
  private zlibPromise: Promise<typeof import("node:zlib")> | null = null;

  private async getZlib(): Promise<typeof import("node:zlib")> {
    if (!this.zlibPromise) {
      this.zlibPromise = import("node:zlib");
    }
    return this.zlibPromise;
  }

  async compress(data: string): Promise<Uint8Array> {
    const zlib = await this.getZlib();
    const buf = Buffer.from(data, "utf8");
    const compressed = zlib.gzipSync(buf);
    return new Uint8Array(compressed);
  }

  async decompress(data: Uint8Array): Promise<string> {
    const zlib = await this.getZlib();
    const buf = Buffer.from(data);
    const decompressed = zlib.gunzipSync(buf);
    return decompressed.toString("utf8");
  }
}

let _default: Compressor | null = null;

export function getDefaultCompressor(): Compressor {
  if (!_default) _default = new NoopCompressor();
  return _default;
}

export function setDefaultCompressor(c: Compressor): void {
  _default = c;
}

export function createNoopCompressor(): Compressor {
  return new NoopCompressor();
}

export function createGzipCompressor(): Compressor {
  return new GzipCompressor();
}
