/** @workspace/domain/localization — Localization */
import type { Money } from "../shared";
export interface Language {
  readonly code: string;
  readonly name: string;
  readonly direction: "ltr" | "rtl";
}
export interface Region {
  readonly code: string;
  readonly name: string;
  readonly defaultLanguage: string;
  readonly defaultCurrency: string;
}
export interface TaxRule {
  readonly id: string;
  readonly region: string;
  readonly rate: number;
  readonly isIncluded: boolean;
}
export interface Translation {
  readonly entityId: string;
  readonly field: string;
  readonly sourceLanguage: string;
  readonly targetLanguage: string;
  readonly translatedText: string;
  readonly quality: number;
}
export interface LocalizedPrice {
  readonly basePrice: Money;
  readonly taxAmount: Money;
  readonly finalPrice: Money;
  readonly displayPrice: string;
}
export interface LocalizationService {
  translate(text: string, from: string, to: string): Promise<Translation>;
  calculateTax(amount: Money, region: string): { tax: Money; rule: TaxRule };
  formatPrice(amount: Money, region: string): string;
}
