/**
 * @workspace/infrastructure/connectors/manufacturers/intel/auth
 *
 * Intel API key authentication. The Intel Developer API uses a simple
 * API key passed in the X-Intel-API-Key header.
 *
 * For local development without an API key, set INTEL_API_KEY=offline
 * to use the offline/replay mode (ReplayTransport).
 */
import type { AuthProvider, HttpRequest } from "../../core/types";

export interface IntelAuthConfig {
  readonly apiKey: string;
}

export class IntelApiKeyAuth implements AuthProvider {
  readonly name = "intel-api-key";

  constructor(private readonly config: IntelAuthConfig) {}

  authenticate(request: HttpRequest): Promise<HttpRequest> {
    return Promise.resolve({
      ...request,
      headers: {
        ...request.headers,
        "X-Intel-API-Key": this.config.apiKey,
        "Accept": "application/json"
      }
    });
  }
}

export function createIntelAuth(config: IntelAuthConfig): AuthProvider {
  return new IntelApiKeyAuth(config);
}
