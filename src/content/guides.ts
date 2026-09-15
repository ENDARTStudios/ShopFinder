/**
 * NOVA_DIRECAO B3 — conteúdo editorial (guias de compra).
 * Data-driven: novo guia = nova entrada aqui. Corpo em PT (maior audiência);
 * títulos/resumo ×3 para navegação.
 */
export interface Guide {
  slug: string;
  icon: string;
  minutes: number;
  title: { "pt-BR": string; en: string; "es-ES": string };
  summary: { "pt-BR": string; en: string; "es-ES": string };
  body: string[]; // parágrafos em PT (audiência principal)
}

export const GUIDES: Guide[] = [
  {
    slug: "como-escolher-fonte",
    icon: "Zap",
    minutes: 6,
    title: {
      "pt-BR": "Como escolher a fonte (PSU) do seu PC",
      en: "How to choose your PC power supply (PSU)",
      "es-ES": "Cómo elegir la fuente (PSU) de tu PC"
    },
    summary: {
      "pt-BR": "Wattagem real, certificação 80 Plus e por que a fonte nunca é o lugar para economizar.",
      en: "Real wattage, 80 Plus ratings and why the PSU is the last place to save money.",
      "es-ES": "Vatios reales, certificación 80 Plus y por qué la fuente es el último lugar para ahorrar."
    },
    body: [
      "A fonte é o único componente que alimenta tudo o mais — e o mais negligenciado na hora da compra. O primeiro passo é calcular o consumo real do sistema: some o TDP do processador e da placa de vídeo e adicione 50-100 W para o resto. Sites de fabricantes de PSUs oferecem calculadoras confiáveis.",
      "Wattagem de pico não é wattagem contínua. Uma fonte de 600 W reais é melhor que uma de 750 W 'de pico'. Desconfie de fontes que anunciam apenas potência de pico — normalmente são unidades de baixa qualidade.",
      "A certificação 80 Plus (White → Bronze → Gold → Platinum → Titanium) mede eficiência. Gold é o ponto ideal custo-benefício hoje. Além do selo, procure unidades com proteções completas (OCP, OVP, SCP) — lists usuais de review são sua melhor fonte.",
      "No ShopFinder você compara preço e disponibilidade de fontes dos três nichos de fornecedores integrados; use o ranking neutro para decidir e confira sempre o selo de eficiência na página do fabricante antes de fechar."
    ]
  }
];

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}
