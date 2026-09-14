# ShopFinder — Brand System

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

**[`docs/brand-grid.md`](./brand-grid.md)**

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
