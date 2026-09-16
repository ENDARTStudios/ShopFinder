/**
 * Derivação de marca a partir do título do produto.
 * (Fonte única — usada pelo /api/catalog e pela página de resultados T107.)
 */
export const KNOWN_BRANDS = [
  "Intel",
  "AMD",
  "NVIDIA",
  "Samsung",
  "Kingston",
  "Corsair",
  "ASUS",
  "STMicroelectronics",
  "Espressif",
  "Texas Instruments",
  "Bosch",
  "Apple"
];

export function extractBrand(title: string): string {
  for (const brand of KNOWN_BRANDS) {
    if (title.toLowerCase().includes(brand.toLowerCase())) return brand;
  }
  return title.split(" ")[0] ?? "Unknown";
}
