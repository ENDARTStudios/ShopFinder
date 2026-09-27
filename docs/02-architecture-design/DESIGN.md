# DESIGN — Direção Visual, Brand e Motion

> Reorganização 2026-09 (#79): arquivo fundido a partir de fontes separadas. Conteúdo de cada fonte preservado verbatim como "Parte N".

---

## Parte — DESIGN

> **Fontes canônicas:** [`docs/02-architecture-design/DESIGN.md`](../02-architecture-design/DESIGN.md) (direção visual/stack de UI) e [`docs/02-architecture-design/DESIGN.md`](../02-architecture-design/DESIGN.md) (skeleton/lazy/animação — **obrigatório**). Brand legado detalhado: `docs/brand-system.md`, `docs/brand-grid.md`.

## Direção: "Commerce Utility"

Sóbrio, útil, rápido — o site é uma **ferramenta de decisão de compra**, não uma vitrine. Estabelecido em T101 (fundação) e consolidado em T102–T104:

- **Light default** (tema claro por padrão; dark é opt-in)
- Home sem wordmark gigante, sem badges decorativos, sem 3D
- **Semânticas de compra primeiro**: preço, disponibilidade, fornecedor — acima de qualquer elemento estético

## Componentes-chave

| Componente                                           | Papel                                                                                                                     |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `src/components/ui/price.tsx` (`PriceBlock`)         | Preço protagonista com `tabular-nums`, provider label, badges semânticos (stock/deal/best)                                |
| `src/components/layout/header.tsx` (`UtilityHeader`) | Header utilitário com busca persistente → `/produtos?q=`; `Breadcrumbs` exportados daqui                                  |
| `src/components/site/results-view.tsx`               | Toolbar de resultados: sort segmentado, densidade grid/lista, filtros supplier/marca/preço/estoque (URL-state, T102/T107) |
| `src/components/compare/compare-bar.tsx`             | Barra sticky de comparação (T104): thumbnails (máx 3 + "+N"), contagem `aria-live`, "Limpar tudo" com confirmação         |
| `src/components/product/*`                           | PDP como hub de decisão (T103): PriceBox → histórico de preço (sparkline SVG) → specs → reviews                           |

## Regras práticas

1. **Números com `tabular-nums`** — preços e medidas nunca "dançam".
2. **Nunca inventar dado**: frete só aparece se existir `shippingCostMinorUnits`; veredito de preço só com ≥ 7 dias de snapshot; senão, estado neutro honesto.
3. **CTA externo** (fornecedor) só com URL real, sempre `rel="sponsored noopener noreferrer"`.
4. Tela/carregamento novo → seguir `MOTION-SYSTEM.md`: skeleton, lazy loading, animação de entrada/saída, `prefers-reduced-motion` respeitado.
5. Stack: Tailwind v4 (`@theme inline`, `@custom-variant dark`) + componentes shadcn/ui (`@workspace/ui`).
6. Acessibilidade faz parte do design: [ACCESSIBILITY.md](../07-operations-marketing/ACCESSIBILITY.md).

## Como manter

Novo padrão visual ou componente recorrente → documentar em `docs/02-architecture-design/DESIGN.md`; este resumo muda só quando a **direção** muda (decisão = entrada em `DECISOES.md`).

---

## Parte — FRONTEND-DESIGN

## 1. Ordem do processo de design

1. **Direção visual** — identidade: e-commerce de hardware tech; modo dark-first; precisão técnica.
2. **Tipografia** — sans geométrica para UI (ex. Inter/Geist), monospace para SKUs/preços técnicos; escala 1.25 (12/14/16/20/25/31).
3. **Composição** — grid 12 colunas, produto em destaque 2/3 + specs 1/3; espaçamento em escala de 4px.
4. **Hierarquia** — preço e CTA dominam; specs secundárias; fornecedor invisível.
5. **Identidade** — ver `docs/brand-system.md`; accent único + neutros.

## 2. Stack técnica

| Camada      | Ferramenta                                                                                                                 |
| ----------- | -------------------------------------------------------------------------------------------------------------------------- |
| Base        | Next.js 16 App Router, React 19, Tailwind 4, shadcn/radix                                                                  |
| Motion      | Framer Motion (padrão), GSAP (hero/landing), Anime.js (casos pontuais) — ver `MOTION-SYSTEM.md`                            |
| 3D/WebGL    | Three.js + React Three Fiber — hero de landing com renderização de produto 3D (lazy, só quando visível, fallback estático) |
| Padrões UI  | Referência: 21st.dev, Kokonut UI, Bklit UI, React Bits, Aceternity, Componentry, Refero — sempre adaptados aos tokens      |
| Estado      | Zustand (cart), TanStack Query (server state)                                                                              |
| Formulários | react-hook-form + zod                                                                                                      |
| Charts      | Recharts                                                                                                                   |

### Regra WebGL

Só carregar R3F/Three via `next/dynamic` + `IntersectionObserver`; bundle de 3D nunca no caminho crítico do produto; `prefers-reduced-motion` → versão estática.

## 3. UX guidelines mínimos

- Todo clique tem feedback < 150ms (ripple/scale/toast).
- Carrinho sempre acessível (drawer), estado persistente.
- Preço em BRL sempre com fonte da cotação visível (tooltip).
- Erros com ação recuperável ("tentar de novo"), nunca dead-ends.
- Acessibilidade: WCAG 2.1 AA, foco visível, navegação por teclado no drawer/modal.

---

## Parte — MOTION-SYSTEM

Baseado na skill **motion-design** (princípios: github.com/kylezantos/design-principles). Regras obrigatórias para **toda** interface do ShopFinder.

## 1. Identidade de motion (Brand Motion Identity)

| Constante            | Valor                                                                   |
| -------------------- | ----------------------------------------------------------------------- |
| **Archetype**        | Corporate (UI) / Premium (landing & produto)                            |
| **Signature easing** | `cubic-bezier(0.2, 0, 0, 1)` (Material 3) para 80% dos casos            |
| **Duration palette** | quick 150ms · standard 250ms · slow 400ms                               |
| **Entrance pattern** | fade + translateY(12px→0), ease-out, uma direção consistente (de baixo) |

```css
/* globals.css — tokens */
:root {
  --ease-standard: cubic-bezier(0.2, 0, 0, 1);
  --ease-enter: cubic-bezier(0.05, 0.7, 0.1, 1); /* entrada: decelera */
  --ease-exit: cubic-bezier(0.3, 0, 1, 1); /* saída: acelera */
  --dur-quick: 150ms;
  --dur-standard: 250ms;
  --dur-slow: 400ms;
}
```

## 2. Regras críticas (nunca violar)

1. **Nunca `linear`** para movimento espacial (linear só spinner/progresso).
2. **Nunca só opacity** em mudança de estado importante — combinar com position/scale.
3. Entrada 30–50% mais longa que saída.
4. **3 camadas** em cenas hero: primária + secundária (sombra/ícone) + ambiente (gradiente sutil).
5. **Regra 1/3**: máx. 1/3 dos elementos em movimento simultâneo; stagger total < 500ms.
6. `prefers-reduced-motion: reduce` → desligar transformações, manter fades ≤ 100ms.

## 3. Durações por elemento

| Elemento                 | Duração                          | Easing                       |
| ------------------------ | -------------------------------- | ---------------------------- |
| Tooltip / micro-feedback | 80–120ms                         | ease-out                     |
| Botão (press)            | 120–180ms (scale 0.97)           | ease-out                     |
| Card enter/exit          | 200–350ms                        | enter ease-out, exit ease-in |
| Modal/drawer (cart)      | 300–400ms                        | spring suave                 |
| Transição de página      | 400–600ms                        | ease-out                     |
| Error shake              | 300–400ms, ±10px, 2–3 oscilações | ease-in-out                  |

## 4. Skeletons (obrigatórios em toda rota assíncrona)

- **ProductCard skeleton**: bloco de imagem 4:3 + 2 linhas de texto + linha de preço, shimmer `animate-pulse` com gradiente 1.2s.
- **Página de produto**: skeleton de galeria + specs em `<Suspense>` com `loading.tsx` por rota.
- **Tabela compare**: skeleton de colunas mantendo larguras estáveis (evita layout shift).
- **Admin/pipeline**: skeleton de cards de status.
- Sempre mesmo layout do conteúdo final (mesma altura/largura) — CLS = 0.

## 5. Lazy loading

- `next/dynamic` com `loading: () => <Skeleton/>` para: painel de knowledge IA, cart drawer contents pesados, charts (recharts), compare table.
- Imagens: `next/image` com `placeholder="empty"` + fade-in 200ms on load.
- Stagger de grids: micro cascade 30ms/item, total < 400ms.

## 6. Padrões framer-motion (lib já instalada — passar a usar)

```tsx
// Entrada padrão de card
<motion.div
  initial={{ opacity: 0, y: 12 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -8, transition: { duration: 0.15, ease: [0.3, 0, 1, 1] } }}
  transition={{ duration: 0.25, ease: [0.05, 0.7, 0.1, 1] }}
/>
```

Checklist de PR (adicionado ao template): todo carregamento tem skeleton; toda entrada/saída tem easing direcional; press feedback em botões; `prefers-reduced-motion` respeitado.

## 7. Bibliotecas de UI/motion permitidas

Framer Motion (padrão), GSAP (apenas hero/landing com timelines complexas), React Bits / Aceternity / 21st.dev como referência de padrões — adaptados aos tokens acima, nunca copiados com timing próprio.

---

## Parte — brand-system

> **Official brand guide for ShopFinder.** This document defines the
> complete visual identity system and governs all applications of the
> brand across web, mobile, print, and motion.

**Version**: 1.0.0
**Last updated**: 2026-07-15
**Owner**: END ART

---

## Table of contents

1. [Brand positioning](#1-brand-positioning)
2. [The symbol](#2-the-symbol)
3. [The wordmark](#3-the-wordmark)
4. [Clear space and minimum size](#4-clear-space-and-minimum-size)
5. [Positive and negative versions](#5-positive-and-negative-versions)
6. [Color palette](#6-color-palette)
7. [Typography](#7-typography)
8. [Spacing and layout](#8-spacing-and-layout)
9. [Light and dark backgrounds](#9-light-and-dark-backgrounds)
10. [Digital applications](#10-digital-applications)
11. [Incorrect usage](#11-incorrect-usage)
12. [Brand grid reference](#12-brand-grid-reference)

---

## 1. Brand positioning

> **ShopFinder é uma plataforma de Catalog Intelligence baseada em IA
> que transforma dados heterogêneos de produtos em um catálogo canônico,
> enriquecido, validado e pronto para distribuição em múltiplos canais.**

**Slogan**: `compra inteligente` (always lowercase)

**Core metaphor**: The brand mark visualizes the platform's pipeline —
raw data becomes structured knowledge becomes intelligent insight. The
lens represents the "Finder" — the AI intelligence that converts
information into knowledge.

---

## 2. The symbol

### 2.1 Concept

The ShopFinder symbol is a custom **SF monogram** with a **magnifying
lens** positioned at the S-F intersection. The monogram has a
**continuous color gradient** flowing left → right:

```
Slate-400 (raw)  →  White (structured)  →  Emerald (intelligence)
```

This represents the pipeline transformation:

```
Offer → NormalizedProduct → CanonicalProduct → EnrichedCanonicalProduct
                                                    ↑
                                              LENS HERE
                                         (Manufacturer Enrichment)
```

### 2.2 Construction

The SF is drawn as **geometric SVG paths** (not text), ensuring
reproducibility across any rendering technology. Key properties:

- **Uniform stroke**: 30px (at 512×512 base)
- **Round caps and joins**: modern, friendly
- **Optical corrections**: S is 10px taller than F; F middle bar is 82%
  of top bar length
- **Lens at S-F junction**: center (272, 295), radius 68

### 2.3 Meaning

| Element                          | Represents                                                |
| -------------------------------- | --------------------------------------------------------- |
| **S (slate-400, left)**          | Raw offers — unprocessed marketplace data                 |
| **S→F transition (gradient)**    | Normalization + Resolution pipeline                       |
| **F (white, center-right)**      | Canonical Product — consolidated, structured              |
| **Lens (emerald, S-F junction)** | Manufacturer Enrichment — intelligence applied            |
| **F (emerald, right edge)**      | EnrichedCanonicalProduct — fully understood               |
| **Lens handle**                  | The "reach" of the intelligence — extends beyond the lens |

### 2.4 Canonical file

The source of truth is `public/icon.svg` (512×512). All other formats
derive from it. See `docs/brand-grid.md` for exact coordinates.

---

## 3. The wordmark

### 3.1 Construction

The wordmark uses the **system sans-serif stack** (no custom font
required):

```css
font-family:
  ui-sans-serif,
  system-ui,
  -apple-system,
  "Segoe UI",
  Roboto,
  sans-serif;
font-weight: 900;
letter-spacing: -0.02em;
```

### 3.2 Usage

| Context          | Size           | Weight          | Color      |
| ---------------- | -------------- | --------------- | ---------- |
| Header (compact) | 14px (text-sm) | 900 (font-bold) | foreground |
| Hero (large)     | 48–64px        | 900             | foreground |
| OG image         | 36px           | 900             | #FFFFFF    |
| Footer           | 12px (text-xs) | 900 (font-bold) | foreground |

### 3.3 Slogan

The slogan `compra inteligente` appears **always in lowercase**:

| Context  | Size    | Weight | Color            | Tracking |
| -------- | ------- | ------ | ---------------- | -------- |
| Header   | 10px    | 500    | muted-foreground | 0.05em   |
| Hero     | 18–28px | 500    | emerald-500      | 0.08em   |
| OG image | 18px    | 500    | #10B981          | 0.08em   |
| Footer   | 12px    | 400    | muted-foreground | normal   |

---

## 4. Clear space and minimum size

### 4.1 Clear space (protection area)

The symbol requires clear space equal to **the lens radius** (68px at
512 base, or ~13% of the symbol width) on all sides:

```
┌─────────────────────────────────┐
│                                 │ ← clear space
│   ┌─────────────────────────┐   │
│   │                         │   │
│   │      [SF + lens]        │   │
│   │                         │   │
│   └─────────────────────────┘   │
│                                 │ ← clear space
└─────────────────────────────────┘
```

No other graphic element, text, or interface component may enter this
zone.

### 4.2 Minimum size

| Application      | Minimum size | Notes                                       |
| ---------------- | ------------ | ------------------------------------------- |
| **Favicon**      | 16×16        | SF simplified to bold letters + emerald dot |
| **App icon**     | 48×48        | Full monogram + lens visible                |
| **Print**        | 24×24 mm     | Below this, use wordmark only               |
| **Digital (UI)** | 32×32        | Full monogram + lens visible                |

Below 16×16, the SF monogram loses legibility. Use the **emerald lens
dot** alone as a minimal brand indicator.

---

## 5. Positive and negative versions

### 5.1 Positive (dark background — primary)

```
Background:  #0F172A (slate-900)
SF gradient: slate-400 → white → emerald
Lens:        emerald-500
```

This is the **primary** version, used on the website, dashboard, and
dark UI surfaces.

### 5.2 Negative (light background)

```
Background:  #FFFFFF (white) or #F8FAFC (slate-50)
SF gradient: slate-500 → slate-900 → emerald-600
Lens:        emerald-600
```

For light backgrounds, the gradient darkens:

- Raw: `#64748B` (slate-500)
- Structured: `#0F172A` (slate-900)
- Intelligence: `#059669` (emerald-600)

### 5.3 Monochrome (single color)

For single-color applications (stamps, embossing, embroidery):

```
SF:          100% opacity (solid color)
Lens outline: 100% opacity
Lens fill:    0% opacity (transparent — just the ring)
```

Use the brand's primary color (emerald-500) or the surface contrast color.

---

## 6. Color palette

### 6.1 Primary colors

| Name            | Hex       | RGB           | Usage                      |
| --------------- | --------- | ------------- | -------------------------- |
| **Emerald-500** | `#10B981` | 16, 185, 129  | Intelligence, lens, accent |
| **Slate-900**   | `#0F172A` | 15, 23, 42    | Background, primary text   |
| **White**       | `#FFFFFF` | 255, 255, 255 | Structured SF, light text  |

### 6.2 Secondary colors

| Name          | Hex       | RGB           | Usage                             |
| ------------- | --------- | ------------- | --------------------------------- |
| **Slate-400** | `#94A3B8` | 148, 163, 184 | Raw SF (gradient left)            |
| **Slate-800** | `#1E293B` | 30, 41, 59    | Brand mark container (OG/Twitter) |
| **Slate-500** | `#64748B` | 100, 116, 139 | Muted text, captions              |
| **Slate-50**  | `#F8FAFC` | 248, 250, 252 | Light background                  |

### 6.3 Semantic colors

| Name                | Hex       | Usage                           |
| ------------------- | --------- | ------------------------------- |
| **Green (success)** | `#10B981` | Same as emerald — brand-aligned |
| **Amber (warning)** | `#F59E0B` | Review state                    |
| **Red (error)**     | `#EF4444` | Reject state                    |
| **Blue (info)**     | `#3B82F6` | Neutral information             |

### 6.4 Color contrast

| Foreground  | Background | Ratio  | Grade |
| ----------- | ---------- | ------ | ----- |
| White       | Slate-900  | 17.9:1 | AAA   |
| Slate-400   | Slate-900  | 7.2:1  | AAA   |
| Emerald-500 | Slate-900  | 6.7:1  | AAA   |
| Slate-500   | Slate-900  | 5.3:1  | AA    |

---

## 7. Typography

### 7.1 Font stack

ShopFinder uses the **system sans-serif stack** — no custom font
bundling required. This ensures instant rendering on all platforms:

```css
font-family:
  ui-sans-serif,
  system-ui,
  -apple-system,
  "Segoe UI",
  Roboto,
  "Helvetica Neue",
  Arial,
  sans-serif;
```

For monospace contexts (code, technical data):

```css
font-family:
  ui-monospace, "SF Mono", Menlo, Monaco, "Cascadia Code", "Roboto Mono", Consolas, monospace;
```

### 7.2 Type scale

| Level   | Size    | Weight | Line height | Usage             |
| ------- | ------- | ------ | ----------- | ----------------- |
| Display | 80px    | 900    | 1.05        | OG image headline |
| H1      | 48–64px | 900    | 1.1         | Hero title        |
| H2      | 36px    | 900    | 1.2         | Section title     |
| H3      | 28px    | 700    | 1.3         | Subsection        |
| Body L  | 20px    | 400    | 1.5         | Lead paragraph    |
| Body    | 16px    | 400    | 1.5         | Default text      |
| Body S  | 14px    | 400    | 1.5         | UI text           |
| Caption | 12px    | 500    | 1.4         | Labels, metadata  |
| Micro   | 10px    | 500    | 1.2         | Header tagline    |

### 7.3 Font weights

| Weight      | Value | Usage                              |
| ----------- | ----- | ---------------------------------- |
| **Black**   | 900   | Brand name, headlines, SF monogram |
| **Bold**    | 700   | Section titles, emphasis           |
| **Medium**  | 500   | Captions, labels, tagline          |
| **Regular** | 400   | Body text, descriptions            |

---

## 8. Spacing and layout

### 8.1 Spacing scale (8px base)

| Token | Value | Usage                      |
| ----- | ----- | -------------------------- |
| `xs`  | 4px   | Tight gaps (icon + text)   |
| `sm`  | 8px   | Component internal padding |
| `md`  | 16px  | Default element gap        |
| `lg`  | 24px  | Section internal gap       |
| `xl`  | 32px  | Section gap                |
| `2xl` | 48px  | Hero padding               |
| `3xl` | 80px  | OG image padding           |

### 8.2 Border radius

| Token  | Value  | Usage                               |
| ------ | ------ | ----------------------------------- |
| `sm`   | 6px    | Small buttons, inputs               |
| `md`   | 8px    | Cards, buttons                      |
| `lg`   | 12px   | Large cards                         |
| `xl`   | 22px   | Brand mark container (at 96px base) |
| `full` | 9999px | Circular elements (lens, avatar)    |

### 8.3 Max width

| Context           | Max width          |
| ----------------- | ------------------ |
| Content container | 1280px (max-w-7xl) |
| Prose             | 720px              |
| OG image          | 1200px             |
| Mobile breakpoint | 640px              |

---

## 9. Light and dark backgrounds

### 9.1 Dark background (primary)

The brand is designed **dark-first**. The primary background is
`#0F172A` (slate-900), which makes the SF gradient and emerald lens
glow with maximum contrast.

**Use when**: Website, dashboard, code editor, dark mode UI.

### 9.2 Light background

On light backgrounds, use the **negative version**:

```
Background:  #F8FAFC (slate-50) or #FFFFFF
SF:          slate-500 → slate-900 → emerald-600
Lens:        emerald-600
Text:        slate-900
```

**Use when**: Documentation, print, presentations, light mode UI.

### 9.3 Tinted background

On emerald-tinted backgrounds (for accent sections):

```
Background:  rgba(16, 185, 129, 0.10) on slate-900
SF:          standard gradient
Text:        white
```

**Use when**: CTA sections, featured cards, highlights.

---

## 10. Digital applications

### 10.1 Favicon

- **Primary**: `public/icon.svg` (scalable, modern browsers)
- **Fallback**: `src/app/icon.tsx` (32×32 PNG, edge-rendered)
- **Legacy**: `public/favicon.ico` (32×32 ICO)

### 10.2 PWA icons

| File                    | Size    | Purpose              |
| ----------------------- | ------- | -------------------- |
| `icon-192.png`          | 192×192 | PWA standard         |
| `icon-512.png`          | 512×512 | PWA standard         |
| `icon-maskable-192.png` | 192×192 | Maskable (safe zone) |
| `icon-maskable-512.png` | 512×512 | Maskable (safe zone) |
| `apple-touch-icon.png`  | 180×180 | iOS home screen      |

### 10.3 Open Graph image

- **File**: `src/app/opengraph-image.tsx` (1200×630, edge-rendered)
- **Content**: Brand mark + wordmark + tagline + headline + pipeline stats
- **Used by**: Facebook, LinkedIn, Slack, Discord, WhatsApp, Telegram

### 10.4 Twitter Card

- **File**: `src/app/twitter-image.tsx` (1200×600, edge-rendered)
- **Content**: Centered brand mark + wordmark + tagline
- **Used by**: Twitter/X timeline

### 10.5 Manifest

- **File**: `public/manifest.webmanifest`
- **Theme color**: `#0F172A`
- **Display**: standalone + window-controls-overlay

---

## 11. Incorrect usage

### 11.1 Don't distort the symbol

```
✗ DO NOT stretch or compress
✗ DO NOT rotate
✗ DO NOT skew
```

The SF monogram and lens must always maintain their exact proportions.
Use the scaling rules from the brand grid.

### 11.2 Don't change the gradient direction

```
✗ DO NOT reverse the gradient (emerald → white → slate)
✗ DO NOT use vertical gradient
✗ DO NOT use radial gradient
```

The gradient always flows **left → right**, matching the pipeline
direction (raw → structured → intelligence).

### 11.3 Don't reposition the lens

```
✗ DO NOT move the lens to the top-left
✗ DO NOT move the lens outside the SF
✗ DO NOT remove the lens
```

The lens sits at the **S-F intersection** (center), representing
Manufacturer Enrichment. This position is semantically meaningful.

### 11.4 Don't use off-palette colors

```
✗ DO NOT use blue instead of emerald
✗ DO NOT use gray instead of slate-400 for raw
✗ DO NOT use cream instead of white for structured
```

Only the colors defined in section 6 are permitted.

### 11.5 Don't add effects

```
✗ DO NOT add drop shadows
✗ DO NOT add glow effects (beyond the 0.12 opacity lens tint)
✗ DO NOT add gradients to the background
✗ DO NOT add borders to the symbol
```

The symbol is flat and geometric. Effects clutter the design and
reduce legibility at small sizes.

### 11.6 Don't use the wordmark without the slogan context

```
✗ DO NOT write "ShopFinder" in title case ("Shopfinder")
✗ DO NOT write the slogan in title case ("Compra Inteligente")
✗ DO NOT use a different slogan
```

The wordmark is always `ShopFinder` (camelCase). The slogan is always
`compra inteligente` (lowercase).

### 11.7 Don't place on busy backgrounds

```
✗ DO NOT place on photographs without a solid overlay
✗ DO NOT place on patterned backgrounds
✗ DO NOT place on competing brand colors
```

Always ensure sufficient contrast. Use the dark or light version
appropriately.

---

## 12. Brand grid reference

For the complete geometric specification — exact coordinates, path
data, stroke widths, lens radius, and scaling rules — see:

**[`docs/brand-grid.md`](#parte--brand-grid)**

That document is the **engineering source of truth**. This brand system
document is the **design governance** reference. Together, they ensure
the brand is implemented consistently across all touchpoints.

---

## Version history

| Version | Date       | Changes                                                                                  |
| ------- | ---------- | ---------------------------------------------------------------------------------------- |
| 1.0.0   | 2026-07-15 | Initial brand system. Custom SF monogram, continuous gradient, lens at S-F intersection. |

---

## Contact

**Brand owner**: END ART
**Repository**: ShopFinder
**Canonical files**: `public/icon.svg`, `docs/brand-grid.md`, `docs/brand-system.md`

For brand-related questions or asset requests, refer to this document
first. If a use case is not covered here, default to the principles
established in section 2 (The symbol) and section 11 (Incorrect usage).

---

## Parte — brand-grid

> **Source of truth for the ShopFinder brand mark.** All implementations
> (SVG, TSX, Canvas, PNG, print, animation) must derive from these exact
> coordinates. Deviations break brand consistency.

**Version**: 1.0.0
**Last updated**: 2026-07-15
**Canonical file**: `public/icon.svg`

---

## 1. Canvas

| Property               | Value                                    |
| ---------------------- | ---------------------------------------- |
| **Canvas size**        | 512 × 512 px                             |
| **ViewBox**            | `0 0 512 512`                            |
| **Safe zone (margin)** | 64 px (for maskable variants)            |
| **Background shape**   | Rounded square                           |
| **Background rect**    | `x=32, y=32, w=448, h=448, rx=96, ry=96` |
| **Background color**   | `#0F172A` (slate-900)                    |

```
┌──────────────────────────────────────────┐
│ 32px margin                              │
│  ┌────────────────────────────────────┐  │
│  │                                    │  │
│  │         [SF monogram + lens]       │  │
│  │                                    │  │
│  └────────────────────────────────────┘  │
│                              32px margin │
└──────────────────────────────────────────┘
```

---

## 2. SF Monogram (custom geometric paths)

The SF is drawn as **SVG paths**, not text. This ensures brand
reproducibility across any rendering technology.

### 2.1 Stroke properties

| Property            | Value                            |
| ------------------- | -------------------------------- |
| **Stroke width**    | 30 px (uniform across all paths) |
| **Stroke linecap**  | `round`                          |
| **Stroke linejoin** | `round`                          |
| **Fill**            | `none` (stroke only)             |

### 2.2 S (left letter)

| Property    | Value                                                                                           |
| ----------- | ----------------------------------------------------------------------------------------------- |
| **Path**    | `M 230 170 C 230 150, 150 150, 150 200 C 150 245, 230 245, 230 290 C 230 335, 150 335, 150 380` |
| **X-range** | 150 – 230 (width 80px)                                                                          |
| **Y-range** | 170 – 380 (height 210px)                                                                        |
| **Curves**  | 3 cubic beziers (top → middle → bottom)                                                         |

### 2.3 F (right letter)

| Property                         | Value                           |
| -------------------------------- | ------------------------------- |
| **Vertical + top bar (L-shape)** | `M 340 175 L 255 175 L 255 375` |
| **Middle bar**                   | `M 255 275 L 325 275`           |
| **X-range**                      | 255 – 340 (width 85px)          |
| **Y-range**                      | 175 – 375 (height 200px)        |
| **Top bar length**               | 85 px (340 - 255)               |
| **Middle bar length**            | 70 px (325 - 255)               |

### 2.4 Optical corrections

| Correction                                   | Rationale                                                                   |
| -------------------------------------------- | --------------------------------------------------------------------------- |
| **S is 10px taller than F** (210 vs 200)     | Curved letters appear visually shorter than straight ones; this compensates |
| **F middle bar = 82% of top bar** (70 vs 85) | Standard F proportion for visual balance                                    |
| **S-F gap = 25px** (230 to 255)              | Prevents letters from touching while maintaining visual unity               |

### 2.5 S-F intersection

| Property               | Value                             |
| ---------------------- | --------------------------------- |
| **S right edge**       | x = 230                           |
| **F left edge**        | x = 255                           |
| **Intersection X**     | 242 (midpoint of gap)             |
| **Vertical center**    | y = 275 (where F middle bar sits) |
| **Intersection point** | (242, 275)                        |

---

## 3. Lens (at S-F intersection)

The lens represents **Manufacturer Enrichment** — the central stage of
the architecture. It sits at the S-F junction, symbolizing that
intelligence acts on an already-consolidated product.

| Property               | Value                                       |
| ---------------------- | ------------------------------------------- |
| **Center**             | (272, 295) — slightly right of S-F boundary |
| **Radius**             | 68 px                                       |
| **Outline stroke**     | 8 px                                        |
| **Outline color**      | `#10B981` (emerald-500)                     |
| **Fill**               | `none` (ring only)                          |
| **Tint (inside lens)** | `#10B981` @ opacity 0.12 (subtle glow)      |

### 3.1 Handle

| Property           | Value                         |
| ------------------ | ----------------------------- |
| **Start point**    | (312, 335) — lens edge at 45° |
| **End point**      | (360, 383)                    |
| **Stroke width**   | 22 px                         |
| **Stroke linecap** | `round`                       |
| **Color**          | `#10B981` (emerald-500)       |
| **Angle**          | 45° (bottom-right)            |

---

## 4. Continuous gradient

The SF monogram has a **continuous color gradient** flowing left → right,
representing the pipeline transformation:

```
slate-400 (raw)  →  white (structured)  →  emerald (intelligence)
```

### 4.1 Gradient specification

| Property              | Value                 |
| --------------------- | --------------------- |
| **Type**              | `linearGradient`      |
| **Coordinate system** | `userSpaceOnUse`      |
| **Direction**         | Left → right (x-axis) |
| **X1**                | 150 (left edge of S)  |
| **X2**                | 340 (right edge of F) |

### 4.2 Color stops

| Offset | Color       | Hex       | Meaning                             |
| ------ | ----------- | --------- | ----------------------------------- |
| 0%     | Slate-400   | `#94A3B8` | Raw (dado bruto)                    |
| 30%    | Slate-400   | `#94A3B8` | Still raw                           |
| 50%    | White       | `#FFFFFF` | Structured (produto identificado)   |
| 70%    | White       | `#FFFFFF` | Still structured                    |
| 85%    | Emerald-500 | `#10B981` | Intelligence (produto compreendido) |
| 100%   | Emerald-500 | `#10B981` | Intelligence                        |

### 4.3 Pipeline mapping

```
Gradient zone     Pipeline stage
──────────────    ──────────────────────────
0%–30% (slate)    RawProductRecord (Offer)
30%–50% (→white)  Normalizer + Similarity + Resolution
50%–70% (white)   CanonicalProduct (consolidated)
70%–85% (→emerald) Manufacturer Enrichment ← LENS HERE
85%–100% (emerald) AI Evaluation + Compliance (intelligence)
```

---

## 5. Color palette

| Token           | Hex       | RGB           | Usage                                        |
| --------------- | --------- | ------------- | -------------------------------------------- |
| **slate-900**   | `#0F172A` | 15, 23, 42    | Background                                   |
| **slate-400**   | `#94A3B8` | 148, 163, 184 | Raw SF (gradient left)                       |
| **white**       | `#FFFFFF` | 255, 255, 255 | Structured SF (gradient center)              |
| **emerald-500** | `#10B981` | 16, 185, 129  | Intelligence SF + lens (gradient right)      |
| **slate-800**   | `#1E293B` | 30, 41, 59    | Brand mark container background (OG/Twitter) |

---

## 6. Scaling rules

When scaling the brand mark to different sizes, all dimensions scale
**proportionally** from the 512×512 base.

| Target size  | Scale factor | Stroke | Lens radius | Lens center |
| ------------ | ------------ | ------ | ----------- | ----------- |
| 512 (base)   | 1.0×         | 30     | 68          | (272, 295)  |
| 180 (Apple)  | 0.352×       | 10.5   | 24          | (96, 104)   |
| 96 (OG mark) | 0.188×       | 5.6    | 13          | (51, 55)    |
| 32 (favicon) | 0.063×       | 1.9    | 4           | (17, 19)    |
| 16 (tiny)    | 0.031×       | 0.9    | 2           | (8, 9)      |

**Minimum size**: 16×16 (below this, the SF monogram loses legibility;
use just the emerald lens dot as a fallback).

---

## 7. File inventory

| File                           | Format       | Size     | Purpose                            |
| ------------------------------ | ------------ | -------- | ---------------------------------- |
| `public/icon.svg`              | SVG          | 512×512  | **Source of truth** (scalable)     |
| `public/favicon.ico`           | ICO          | 32×32    | Legacy browser fallback            |
| `public/favicon-16.png`        | PNG          | 16×16    | Modern favicon                     |
| `public/favicon-32.png`        | PNG          | 32×32    | Modern favicon                     |
| `public/apple-touch-icon.png`  | PNG          | 180×180  | iOS home screen                    |
| `public/icon-192.png`          | PNG          | 192×192  | PWA standard                       |
| `public/icon-512.png`          | PNG          | 512×512  | PWA standard                       |
| `public/icon-maskable-192.png` | PNG          | 192×192  | PWA maskable (safe zone)           |
| `public/icon-maskable-512.png` | PNG          | 512×512  | PWA maskable (safe zone)           |
| `src/app/icon.tsx`             | TSX (Satori) | 32×32    | Dynamic favicon (edge-rendered)    |
| `src/app/apple-icon.tsx`       | TSX (Satori) | 180×180  | Dynamic Apple icon (edge-rendered) |
| `src/app/opengraph-image.tsx`  | TSX (Satori) | 1200×630 | Dynamic OG image                   |
| `src/app/twitter-image.tsx`    | TSX (Satori) | 1200×600 | Dynamic Twitter Card               |

**Regenerate static PNGs**: `python3 scripts/generate-icons.py`

---

## 8. Satori approximation note

Satori (Next.js `ImageResponse`) does not support SVG `linearGradient`
or `clipPath`. The TSX versions (`icon.tsx`, `apple-icon.tsx`,
`opengraph-image.tsx`, `twitter-image.tsx`) approximate the continuous
gradient via **layered overlapping spans**:

1. **Layer 1**: SF in slate-400, positioned left
2. **Layer 2**: SF in white, positioned center-right (offset so left
   edge of slate-400 shows through)
3. **Layer 3**: Emerald lens circle at center (S-F junction) with
   semi-transparent fill + mini emerald SF inside

The SVG version (`public/icon.svg`) is the **canonical** implementation
with true continuous gradient. The TSX versions are functional
approximations for edge-rendered contexts.
