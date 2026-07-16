/**
 * @workspace/infrastructure/connectors/digikey/mapper.test
 *
 * Tests for the DigiKey mapper.
 */
/// <reference types="bun-types" />
import { describe, it, expect } from "bun:test";
import { DigiKeyProductMapper } from "./mapper";
import type { ParsedDigiKeyProduct } from "./parser";

function makeProduct(o?: Partial<ParsedDigiKeyProduct>): ParsedDigiKeyProduct {
  return {
    digiKeyPartNumber: "STM32F407VGT6-ND",
    manufacturerPartNumber: "STM32F407VGT6",
    manufacturerName: "STMicroelectronics",
    manufacturerId: 412,
    productDescription: "IC MCU 32BIT 1MB FLASH 100LQFP",
    detailedDescription: "ARM Cortex-M4 STM32F4 Microcontroller 1MB Flash 168MHz",
    productUrl: "https://www.digikey.com/en/products/detail/stm/STM32F407VGT6/2755668",
    primaryPhotoUrl: "https://media.digikey.com/photos/stm32.jpg",
    primaryDatasheetUrl: "https://www.st.com/resource/en/datasheet/stm32f407vg.pdf",
    unitPrice: 14.21,
    currency: "USD",
    quantityAvailable: 45821,
    minimumOrderQuantity: 1,
    productStatus: "Active",
    rohsStatus: "ROHS3 Compliant",
    leadStatus: "Lead Free",
    customTariffNumber: "8542.31.0080",
    category: "Integrated Circuits (ICs)",
    subcategory: "Embedded Microcontrollers",
    series: "STM32 F4",
    parameters: [
      { parameterName: "Core Processor", parameterValue: "ARM Cortex-M4" },
      { parameterName: "Program Memory Size", parameterValue: "1MB (1M x 8)" },
      { parameterName: "Speed", parameterValue: "168MHz" },
      { parameterName: "Package / Case", parameterValue: "100-LQFP" },
    ],
    ...o,
  };
}

describe("DigiKey Mapper", () => {
  const mapper = new DigiKeyProductMapper();

  it("should map a complete product with all fields", () => {
    const result = mapper.map(makeProduct());

    expect(result.externalId).toBe("STM32F407VGT6-ND");
    expect(result.title).toContain("IC MCU 32BIT");
    expect(result.marketplace).toBe("digikey");
    expect(result.brand).toBe("STMicroelectronics");
    expect(result.supplierName).toBe("STMicroelectronics");
    expect(result.sourceUrl).toContain("digikey.com");
  });

  it("should map MPN as attribute", () => {
    const result = mapper.map(makeProduct());
    expect(result.attributes["MPN"]).toBe("STM32F407VGT6");
    expect(result.attributes["DigiKey PN"]).toBe("STM32F407VGT6-ND");
  });

  it("should map lifecycle status", () => {
    const result = mapper.map(makeProduct({ productStatus: "Obsolete" }));
    expect(result.attributes["Lifecycle Status"]).toBe("Obsolete");
  });

  it("should map RoHS status", () => {
    const result = mapper.map(makeProduct());
    expect(result.attributes["RoHS"]).toBe("ROHS3 Compliant");
  });

  it("should map datasheet URL", () => {
    const result = mapper.map(makeProduct());
    expect(result.attributes["Datasheet URL"]).toContain("stm32f407vg.pdf");
  });

  it("should map MOQ", () => {
    const result = mapper.map(makeProduct({ minimumOrderQuantity: 250 }));
    expect(result.attributes["MOQ"]).toBe("250");
  });

  it("should map quantity available (real-time stock)", () => {
    const result = mapper.map(makeProduct({ quantityAvailable: 12345 }));
    expect(result.attributes["Quantity Available"]).toBe("12345");
    expect(result.inventory).toBe(12345);
  });

  it("should map price to cents", () => {
    const result = mapper.map(makeProduct({ unitPrice: 14.21, currency: "USD" }));
    expect(result.price.amount).toBe(1421);
    expect(result.price.currency).toBe("USD");
  });

  it("should handle missing price", () => {
    const result = mapper.map(makeProduct({ unitPrice: undefined, currency: undefined }));
    expect(result.price.amount).toBe(0);
  });

  it("should preserve currency", () => {
    const result = mapper.map(makeProduct({ currency: "EUR" }));
    expect(result.price.currency).toBe("EUR");
    expect(result.currency).toBe("EUR");
  });

  it("should map technical parameters as attributes", () => {
    const result = mapper.map(makeProduct({
      parameters: [
        { parameterName: "Capacitance", parameterValue: "10µF" },
        { parameterName: "Voltage Rated", parameterValue: "10V" },
        { parameterName: "Tolerance", parameterValue: "±10%" },
      ],
    }));
    expect(result.attributes["Capacitance"]).toBe("10µF");
    expect(result.attributes["Voltage Rated"]).toBe("10V");
    expect(result.attributes["Tolerance"]).toBe("±10%");
  });

  it("should handle product with no parameters", () => {
    const result = mapper.map(makeProduct({ parameters: undefined }));
    expect(result.attributes["MPN"]).toBeDefined();
    expect(result.attributes["Capacitance"]).toBeUndefined();
  });

  it("should map category and subcategory", () => {
    const result = mapper.map(makeProduct({
      category: "Integrated Circuits (ICs)",
      subcategory: "Embedded Microcontrollers",
      series: "STM32 F4",
    }));
    expect(result.category).toBe("Integrated Circuits (ICs)");
    expect(result.attributes["Category"]).toBe("Integrated Circuits (ICs)");
    expect(result.attributes["Subcategory"]).toBe("Embedded Microcontrollers");
    expect(result.attributes["Series"]).toBe("STM32 F4");
  });

  it("should map tariff number", () => {
    const result = mapper.map(makeProduct());
    expect(result.attributes["Tariff Number"]).toBe("8542.31.0080");
  });

  it("should handle minimal product (DigiKey PN only)", () => {
    const result = mapper.map(makeProduct({
      digiKeyPartNumber: "MIN-ND",
      manufacturerPartNumber: "",
      manufacturerName: "",
      productDescription: "Minimal Product",
      detailedDescription: "",
      productUrl: undefined,
      primaryPhotoUrl: undefined,
      primaryDatasheetUrl: undefined,
      unitPrice: undefined,
      currency: undefined,
      quantityAvailable: undefined,
      minimumOrderQuantity: undefined,
      productStatus: undefined,
      rohsStatus: undefined,
      leadStatus: undefined,
      customTariffNumber: undefined,
      parameters: undefined,
      category: undefined,
      subcategory: undefined,
      series: undefined,
    }));
    expect(result.externalId).toBe("MIN-ND");
    expect(result.title).toBe("Minimal Product");
    expect(result.images).toEqual([]);
    expect(result.price.amount).toBe(0);
    expect(result.brand).toBe("");
  });

  it("should map multiple products via mapAll", () => {
    const products = [
      makeProduct({ digiKeyPartNumber: "P1-ND" }),
      makeProduct({ digiKeyPartNumber: "P2-ND" }),
    ];
    const results = mapper.mapAll(products);
    expect(results.length).toBe(2);
    expect(results[0]!.externalId).toBe("P1-ND");
  });
});
