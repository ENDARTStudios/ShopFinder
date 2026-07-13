/**
 * @workspace/ai
 *
 * Decoupled AI provider layer. See ADR-0004 for rationale.
 *
 * Subpaths:
 *   - ./core         : LLMProvider interface, message types, response types
 *   - ./providers    : adapters (openai, anthropic, zai, local)
 *   - ./prompts      : versioned prompt templates per use-case
 *   - ./embeddings   : embedding providers (for RAG / semantic search)
 *   - ./rag          : retrieval-augmented generation pipeline
 *   - ./evaluation   : prompt evaluation harnesses & metrics
 *   - ./tools        : function-calling tool definitions
 *
 * The root export re-exports ./core for the common case:
 *   import { getProvider } from "@workspace/ai";
 */

export { PACKAGE_NAME, PACKAGE_VERSION } from "./core";
