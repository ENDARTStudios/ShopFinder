/** @workspace/domain/media — Media Pipeline */
export interface MediaAsset {
  readonly id: string;
  readonly sourceUrl: string;
  readonly type: "image" | "video";
  readonly status: "pending" | "processing" | "ready" | "failed";
  readonly cdnUrl?: string;
  readonly hash?: string;
  readonly isPrimary: boolean;
}
export interface MediaPipeline {
  process(asset: MediaAsset): Promise<MediaAsset>;
  processBatch(assets: MediaAsset[]): Promise<MediaAsset[]>;
}
export interface MediaStorage {
  upload(data: Buffer, path: string): Promise<{ url: string }>;
  download(url: string): Promise<Buffer>;
}
