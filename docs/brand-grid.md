# ShopFinder — Brand Grid Specification

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
