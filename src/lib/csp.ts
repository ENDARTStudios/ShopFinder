/**
 * ShopFinder — Content-Security-Policy (docs/eng/SECURITY.md)
 *
 * Builder puro (testável) da política com nonce por request.
 * Middleware injeta o nonce; o Next aplica o nonce do header aos seus
 * scripts de bootstrap quando lê a CSP do request header.
 */

export interface CspOptions {
  /** Nonce criado por request (base64). */
  nonce: string;
  /** Dev precisa de unsafe-eval (HMR/Turbopack). */
  isDev: boolean;
  /** Origens extras de connect-src (ex.: ingest do Sentry quando DSN existe). */
  extraConnectSrc?: string[];
}

const BASE_CONNECT_SRC = [
  "'self'",
  "https://api.stripe.com",
  "https://economia.awesomeapi.com.br" // cotação USD-BRL ao vivo (fx.ts)
];

export function buildCsp({ nonce, isDev, extraConnectSrc = [] }: CspOptions): string {
  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    // Fallback para browsers sem strict-dynamic (spec: hosts são ignorados
    // quando strict-dynamic está presente nos modernos)
    "https://js.stripe.com",
    ...(isDev ? ["'unsafe-eval'"] : [])
  ].join(" ");

  const connectSrc = [...BASE_CONNECT_SRC, ...extraConnectSrc].join(" ");

  const directives = [
    `default-src 'self'`,
    `script-src ${scriptSrc}`,
    // Tailwind usa style inline/atributos — sem hash por estilo no orçamento atual
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob: https:`,
    `font-src 'self' data:`,
    `connect-src ${connectSrc}`,
    `frame-src https://js.stripe.com https://hooks.stripe.com`,
    `worker-src 'self' blob:`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    ...(isDev ? [] : ["upgrade-insecure-requests"])
  ];

  return directives.join("; ");
}
