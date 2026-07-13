/**
 * @workspace/domain/lookup
 *
 * Bounded Context: Lookup (reference data)
 *
 * Per Ajustes 4 & 5 of 04B.1 feedback: model Currency and Country as first-class
 * lookup tables instead of hardcoding ISO codes. This enables:
 *   - admin UI to manage active currencies/countries
 *   - tax rules keyed by country
 *   - shipping rules keyed by country
 *   - currency formatting with correct decimal places + symbol
 *
 * These are NOT aggregate roots with rich behavior — they're reference data
 * with soft delete + audit fields. Modeled as simple entities.
 *
 * Seed data: ISO 4217 currencies + ISO 3166-1 countries.
 */

// ── Currency ────────────────────────────────────────────────

export interface Currency {
  readonly code: string; // ISO 4217, PK (e.g. "USD", "BRL", "JPY")
  readonly name: string; // "US Dollar"
  readonly symbol: string; // "$"
  readonly decimalPlaces: number; // 2 for USD, 0 for JPY
  readonly active: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly deletedAt?: Date;
}

// ── Country ─────────────────────────────────────────────────

export interface Country {
  readonly code: string; // ISO 3166-1 alpha-2, PK (e.g. "US", "BR")
  readonly name: string; // "United States"
  readonly region: string; // "Americas", "Europe", "Asia", ...
  readonly active: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly deletedAt?: Date;
}

// ── Seed data (ISO standards) ───────────────────────────────

export const SEED_CURRENCIES: ReadonlyArray<
  Omit<Currency, "createdAt" | "updatedAt" | "deletedAt">
> = [
  { code: "USD", name: "US Dollar", symbol: "$", decimalPlaces: 2, active: true },
  { code: "EUR", name: "Euro", symbol: "€", decimalPlaces: 2, active: true },
  { code: "BRL", name: "Brazilian Real", symbol: "R$", decimalPlaces: 2, active: true },
  { code: "GBP", name: "British Pound", symbol: "£", decimalPlaces: 2, active: true },
  { code: "JPY", name: "Japanese Yen", symbol: "¥", decimalPlaces: 0, active: true },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥", decimalPlaces: 2, active: true },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$", decimalPlaces: 2, active: true },
  { code: "AUD", name: "Australian Dollar", symbol: "A$", decimalPlaces: 2, active: true },
  { code: "CHF", name: "Swiss Franc", symbol: "Fr", decimalPlaces: 2, active: true },
  { code: "INR", name: "Indian Rupee", symbol: "₹", decimalPlaces: 2, active: true },
  { code: "MXN", name: "Mexican Peso", symbol: "$", decimalPlaces: 2, active: true },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$", decimalPlaces: 2, active: true }
];

export const SEED_COUNTRIES: ReadonlyArray<Omit<Country, "createdAt" | "updatedAt" | "deletedAt">> =
  [
    { code: "US", name: "United States", region: "Americas", active: true },
    { code: "BR", name: "Brazil", region: "Americas", active: true },
    { code: "CA", name: "Canada", region: "Americas", active: true },
    { code: "MX", name: "Mexico", region: "Americas", active: true },
    { code: "GB", name: "United Kingdom", region: "Europe", active: true },
    { code: "DE", name: "Germany", region: "Europe", active: true },
    { code: "FR", name: "France", region: "Europe", active: true },
    { code: "IT", name: "Italy", region: "Europe", active: true },
    { code: "ES", name: "Spain", region: "Europe", active: true },
    { code: "NL", name: "Netherlands", region: "Europe", active: true },
    { code: "PT", name: "Portugal", region: "Europe", active: true },
    { code: "CN", name: "China", region: "Asia", active: true },
    { code: "JP", name: "Japan", region: "Asia", active: true },
    { code: "IN", name: "India", region: "Asia", active: true },
    { code: "SG", name: "Singapore", region: "Asia", active: true },
    { code: "AU", name: "Australia", region: "Oceania", active: true },
    { code: "NZ", name: "New Zealand", region: "Oceania", active: true },
    { code: "ZA", name: "South Africa", region: "Africa", active: true },
    { code: "AE", name: "United Arab Emirates", region: "Asia", active: true },
    { code: "TR", name: "Turkey", region: "Asia", active: true }
  ];
