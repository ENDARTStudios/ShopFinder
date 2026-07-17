/**
 * @workspace/integrations/transports — public transport API.
 *
 * Re-exports the Transport contract and the two built-in implementations:
 * `FetchTransport` (real HTTPS) and `ReplayTransport` (sandbox fixtures).
 */

export type {
  Transport,
  TransportRequest,
  TransportResponse
} from "./Transport";
export { buildQueryString } from "./Transport";
export { FetchTransport, type AuthStrategy, type FetchTransportOptions } from "./FetchTransport";
export {
  ReplayTransport,
  MissingFixtureError,
  type ReplayTransportOptions
} from "./ReplayTransport";
