# Open Questions — ShopFinder

> Deliberately undefined items. The AI MUST treat these as open decisions, NOT as gaps to fill automatically.
> If the user asks about any of these, present options with trade-offs. Do not choose silently.

## Undefined

| Topic | Status | Context |
|---|---|---|
| **Payment provider** | Undecided | Cart & checkout are planned but no payment provider chosen. Candidates: Stripe, Mercado Pago, PagSeguro. Decision deferred until checkout is implemented. |
| **Recommendation engine** | Under evaluation | Product recommendations ("users also viewed", "similar products") are not implemented. Options: collaborative filtering, content-based, AI-powered, or third-party (Algolia Recommend). No decision made. |
| **Warehouse synchronization** | Pending | If ShopFinder integrates with physical warehouses, real-time stock sync is needed. Not currently in scope. Decision deferred until warehouse partners are identified. |
| **Search index technology** | Under evaluation | Meilisearch vs Typesense vs Elasticsearch vs Algolia. All are viable. Decision deferred until search performance requirements are measured. |
| **Multi-language i18n** | Partially defined | pt-BR is primary, en is secondary. es, fr, de are planned but not implemented. i18n framework (next-intl vs react-i18next) not chosen. |
| **Image hosting** | Undecided | Product images are currently CSS gradients. When real images are needed: MinIO (self-hosted) vs Cloudflare Images vs Cloudinary. Decision deferred. |
| **CDN strategy** | Undecided | Cloudflare is likely for the web app. Static assets (icons, images) could use Cloudflare CDN or Vercel Edge. Decision deferred until deployment. |
| **Rate limiting strategy** | Partially defined | Per-connector rate limiting exists (in-memory). API rate limiting (for public API consumers) not implemented. Options: Upstash Redis, Cloudflare Workers, custom middleware. |
| **Webhook system** | Not started | Webhooks for catalog changes (product published, price changed, stock updated) are planned but not designed. |
| **Audit log retention** | Undecided | DecisionExplanation and DecisionTrace are produced but retention policy is undefined. How long to keep them? 30 days? 90 days? Forever? |

## How to treat open questions

- Do NOT implement a solution for an open question without explicit user request
- Do NOT assume a technology choice for an open question
- If the user asks about an open question, present 2-3 options with trade-offs
- If an open question blocks a task, flag it to the user before proceeding
