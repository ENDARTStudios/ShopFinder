/**
 * @workspace/ui
 *
 * Domain-Driven Design System. See ADR-0006 for rationale.
 *
 * Layers:
 *   - tokens     : design tokens (color, typography, spacing, ...)
 *   - primitives : re-export of shadcn/ui base components
 *   - commerce   : ProductCard, Price, Money, Rating, StockBadge, ...
 *   - admin      : OrderStatusBadge, KPIWidget, DataTable, ...
 *   - marketing  : Hero, Banner, Countdown, Testimonial, Newsletter, ...
 *   - charts     : RevenueChart, OrdersBarChart, StatusDonut (Recharts wrappers)
 *
 * Import patterns:
 *   import { ProductCard, Price } from "@workspace/ui/commerce";
 *   import { OrderStatusBadge } from "@workspace/ui/admin";
 *   import { tokens } from "@workspace/ui/tokens";
 *   import { Button, Card } from "@workspace/ui/primitives";
 */

export * from "./tokens";
export * from "./commerce";
export * from "./admin";
export * from "./marketing";
export * from "./charts";

// Note: primitives are re-exported on-demand to avoid name collisions.
// Use `import { Button } from "@workspace/ui/primitives"` explicitly.
