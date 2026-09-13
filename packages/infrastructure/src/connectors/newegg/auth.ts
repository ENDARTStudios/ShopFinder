/**
 * @workspace/infrastructure/connectors/newegg/auth
 *
 * Newegg Marketplace API authentication — API key + secret key in headers.
 * Newegg uses a simple API key + secret key scheme passed as headers.
 */
import type { AuthProvider, HttpRequest } from "../core/types";

export interface NeweggAuthConfig {
  readonly apiKey: string;
  readonly secretKey: string;
}

export class NeweggAuthProvider implements AuthProvider {
  readonly name = "newegg-api-key";

  constructor(private readonly config: NeweggAuthConfig) {}

  async authenticate(request: HttpRequest): Promise<HttpRequest> {
    return {
      ...request,
      headers: {
        ...request.headers,
        Authorization: `Bearer ${this.config.apiKey}`,
        "X-Newegg-Secret": this.config.secretKey,
      },
    };
  }
}

export function createNeweggAuthProvider(config: NeweggAuthConfig): NeweggAuthProvider {
  return new NeweggAuthProvider(config);
}
