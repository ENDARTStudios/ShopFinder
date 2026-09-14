/**
 * Feature flags central — fonte única (docs/eng/ARCHITECTURE.md).
 * Lidas no server e passadas ao client via props (nunca NEXT_PUBLIC).
 */

export const featureFlags = {
  compare_v2: false,
  product_knowledge_ai: true,
  fx_live_quotes: true,
  rls_enforcement: false,
  mfa_admin: false,
  new_supplier_connector: false
} as const;

export type FlagKey = keyof typeof featureFlags;
export type FeatureFlagOverrides = Partial<Record<FlagKey, boolean>>;

export function isFlagEnabled(
  flag: FlagKey,
  overrides: FeatureFlagOverrides = {}
): boolean {
  return overrides[flag] ?? featureFlags[flag];
}
