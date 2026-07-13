/**
 * @workspace/contracts
 *
 * Public contracts for the entire platform. Consumed by:
 *   - apps/web (Route Handlers import schemas for validation, DTOs for responses)
 *   - @workspace/integrations (event schemas for webhook validation)
 *   - @workspace/testing (DTOs for fixtures, schemas for mock validation)
 *
 * Subpaths:
 *   - ./dto     : output shapes (Data Transfer Objects)
 *   - ./events  : domain event schemas (Zod) for integration contracts
 *   - ./api     : request/response shapes per endpoint
 *   - ./schemas : Zod input validation schemas
 */

export * from "./dto";
export * from "./events";
export * from "./api";
export * from "./schemas";
