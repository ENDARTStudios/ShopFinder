#!/usr/bin/env bun
/**
 * scripts/record-aliexpress.ts
 *
 * Recording tool for AliExpress API responses.
 *
 * Flow:
 *   1. Calls the real AliExpress API via FetchTransport + AliExpressAuthProvider
 *   2. RecordingTransport wraps the FetchTransport and captures all interactions
 *   3. FixtureRepository saves the recordings to versioned directories
 *   4. The saved fixtures can be used by ReplayTransport in CI
 *
 * Usage:
 *   bun scripts/record-aliexpress.ts --keyword "earbuds" --pages 3
 *   bun scripts/record-aliexpress.ts --category "200001405" --pages 2
 *
 * Environment variables:
 *   ALIEXPRESS_APP_KEY     — Top API app key
 *   ALIEXPRESS_APP_SECRET  — Top API app secret
 *   ALIEXPRESS_TRACKING_ID — Affiliate tracking ID
 *   ALIEXPRESS_API_URL     — (optional) API base URL override
 *
 * Output:
 *   packages/infrastructure/src/connectors/aliexpress/fixtures/
 *     aliexpress/affiliate-query/<date>/
 *       page-001.json
 *       page-002.json
 *       metadata.json
 */
import {
  FetchTransport,
  RecordingTransport,
  createRecordingTransport,
  createFetchTransport,
  createAliExpressAuthProvider,
  AliExpressPagination,
  createAliExpressConnector,
  createNoopRateLimiter,
  createHttpRetryPolicy,
  createStringCheckpointSerializer,
  createFixtureRepository,
  type ConnectorConfig
} from "../packages/infrastructure/src/index.js";

// ── CLI args ───────────────────────────────────────────────

interface CliArgs {
  keyword?: string;
  category?: string;
  pages: number;
  region: string;
  language: string;
  limit: number;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const parsed: CliArgs = {
    pages: 3,
    region: "US",
    language: "en",
    limit: 20
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--keyword":
      case "-k":
        parsed.keyword = args[++i];
        break;
      case "--category":
      case "-c":
        parsed.category = args[++i];
        break;
      case "--pages":
      case "-p":
        parsed.pages = parseInt(args[++i] ?? "3", 10);
        break;
      case "--region":
      case "-r":
        parsed.region = args[++i] ?? "US";
        break;
      case "--language":
      case "-l":
        parsed.language = args[++i] ?? "en";
        break;
      case "--limit":
        parsed.limit = parseInt(args[++i] ?? "20", 10);
        break;
      case "--help":
      case "-h":
        console.log(`
Usage: bun scripts/record-aliexpress.ts [options]

Options:
  -k, --keyword <text>      Search keyword (e.g. "earbuds")
  -c, --category <id>       Category ID (e.g. "200001405")
  -p, --pages <n>           Number of pages to record (default: 3)
  -r, --region <code>       Region code (default: "US")
  -l, --language <code>     Language code (default: "en")
      --limit <n>           Items per page (default: 20)
  -h, --help                Show this help

Environment:
  ALIEXPRESS_APP_KEY        Top API app key (required)
  ALIEXPRESS_APP_SECRET     Top API app secret (required)
  ALIEXPRESS_TRACKING_ID    Affiliate tracking ID (required)
  ALIEXPRESS_API_URL        API base URL (optional)
`);
        process.exit(0);
    }
  }

  return parsed;
}

// ── Main ───────────────────────────────────────────────────

async function main() {
  const args = parseArgs();

  // Check env vars
  const appKey = process.env.ALIEXPRESS_APP_KEY;
  const appSecret = process.env.ALIEXPRESS_APP_SECRET;
  const trackingId = process.env.ALIEXPRESS_TRACKING_ID;
  const apiUrl = process.env.ALIEXPRESS_API_URL;

  if (!appKey || !appSecret || !trackingId) {
    console.error("Error: ALIEXPRESS_APP_KEY, ALIEXPRESS_APP_SECRET, and ALIEXPRESS_TRACKING_ID are required.");
    console.error("Set them as environment variables or in .env");
    process.exit(1);
  }

  console.log("🎬 Recording AliExpress API responses...");
  console.log(`   Keyword: ${args.keyword ?? "(none)"}`);
  console.log(`   Category: ${args.category ?? "(none)"}`);
  console.log(`   Pages: ${args.pages}`);
  console.log(`   Region: ${args.region}`);
  console.log(`   Language: ${args.language}`);
  console.log("");

  // 1. Build the real transport (fetches from AliExpress API)
  const realTransport = createFetchTransport();

  // 2. Wrap with RecordingTransport
  const recordingTransport = createRecordingTransport(realTransport);

  // 3. Build auth provider with real credentials
  const auth = createAliExpressAuthProvider(appKey, appSecret);

  // 4. Build connector config
  const config: ConnectorConfig = {
    provider: "aliexpress",
    transport: recordingTransport,
    auth,
    pagination: new AliExpressPagination(),
    rateLimiter: createNoopRateLimiter(),
    retryPolicy: createHttpRetryPolicy(3),
    checkpointSerializer: createStringCheckpointSerializer(),
    timeoutMs: 30000,
    maxPages: args.pages
  };

  // 5. Create connector
  const connector = createAliExpressConnector(config, trackingId, apiUrl);

  // 6. Discover products (this calls the real API)
  const request = {
    keyword: args.keyword,
    category: args.category,
    region: args.region,
    language: args.language,
    limit: args.limit
  };

  let totalProducts = 0;
  let pageCount = 0;

  try {
    for await (const page of connector.discover(request)) {
      pageCount++;
      totalProducts += page.products.length;
      console.log(`   Page ${pageCount}: ${page.products.length} products (hasMore: ${page.hasMore})`);
    }
  } catch (error) {
    console.error("❌ Error during discovery:", error instanceof Error ? error.message : error);
    // Still save whatever we recorded
  }

  console.log("");
  console.log(`✅ Discovered ${totalProducts} products across ${pageCount} page(s)`);

  // 7. Save recordings via FixtureRepository
  const recordings = recordingTransport.getRecordings();
  console.log(`   Recorded ${recordings.length} HTTP interactions`);

  if (recordings.length > 0) {
    const fixtureRepo = createFixtureRepository(
      "packages/infrastructure/src/connectors/aliexpress/fixtures"
    );

    const savedPath = await fixtureRepo.save(
      "aliexpress",
      "affiliate-query",
      recordings,
      {
        providerVersion: "1.0.0",
        endpoint: "aliexpress.affiliate.product.query",
        traceId: `recording_${Date.now()}`,
        sdkVersion: "1.0.0",
        description: `Keyword: ${args.keyword ?? "none"}, Category: ${args.category ?? "none"}, Pages: ${pageCount}`
      }
    );

    console.log(`   Saved to: ${savedPath}/`);
    console.log("");
    console.log("📝 To use these fixtures in CI:");
    console.log("   The ReplayTransport will automatically load the latest fixture set.");
    console.log("   No code changes needed — just re-run tests.");
  }

  console.log("");
  console.log("Done! ✨");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
