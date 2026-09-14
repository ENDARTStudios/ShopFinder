/**
 * @workspace/infrastructure/connectors/manufacturers/amd/auth
 *
 * AMD Product Master API key authentication.
 *
 * AMD's public Product Master API uses an API key passed in the
 * `X-AMD-API-Key` header. For local development without an API key,
 * use ReplayTransport + NoopAuthProvider in tests.
 */
import type { AuthProvider, HttpRequest } from "../../core/types";

export interface AmdAuthConfig {
  readonly apiKey: string;
}

export class AmdApiKeyAuth implements AuthProvider {
  readonly name = "amd-api-key";

  constructor(private readonly config: AmdAuthConfig) {}

  authenticate(request: HttpRequest): Promise<HttpRequest> {
    return Promise.resolve({
      ...request,
      headers: {
        ...request.headers,
        "X-AMD-API-Key": this.config.apiKey,
        "Accept": "application/json"
      }
    });
  }
}

export function createAmdAuth(config: AmdAuthConfig): AuthProvider {
  return new AmdApiKeyAuth(config);
}
