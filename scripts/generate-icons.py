#!/usr/bin/env python3
"""
ShopFinder — Icon generator.

Generates all raster icons used by the browser, Apple devices, and PWA
installers from the single source-of-truth SVG at public/icon.svg.

Outputs (written to public/):
  - favicon.ico              (multi-resolution: 16, 32, 48)
  - apple-touch-icon.png     (180×180)
  - icon-192.png             (192×192, PWA standard)
  - icon-512.png             (512×512, PWA standard)
  - icon-maskable-192.png    (192×192, maskable with safe zone)
  - icon-maskable-512.png    (512×512, maskable with safe zone)

The maskable variants include extra padding so platforms that crop to
arbitrary shapes (circle, squircle, rounded square) keep the Z glyph
within the safe zone (inner 80%).

Requirements:
  pip install cairosvg pillow

Usage:
  python3 scripts/generate-icons.py
"""
from __future__ import annotations

import io
from pathlib import Path

import cairosvg
from PIL import Image

# ── Paths ──────────────────────────────────────────────────

ROOT = Path(__file__).resolve().parent.parent
SVG_PATH = ROOT / "public" / "icon.svg"
PUBLIC_DIR = ROOT / "public"

# ── Brand colors ───────────────────────────────────────────

SLATE_900 = (15, 23, 42)       # #0F172A — mark background
EMERALD_500 = (16, 185, 129)   # #10B981 — spark
WHITE = (255, 255, 255)

# ── Helpers ────────────────────────────────────────────────


def render_svg_to_png(svg_path: Path, size: int, bg_color=None) -> Image.Image:
    """Render an SVG to a PNG PIL Image at the given size.

    If `bg_color` is provided, composite the SVG (which has transparency
    outside the rounded square) over that solid background. Otherwise,
    return an RGBA image with transparent background.
    """
    png_bytes = cairosvg.svg2png(
        url=str(svg_path),
        output_width=size,
        output_height=size,
        background_color="transparent",
    )
    img = Image.open(io.BytesIO(png_bytes)).convert("RGBA")
    if bg_color is not None:
        bg = Image.new("RGBA", (size, size), bg_color + (255,))
        bg.paste(img, mask=img.split()[3])  # paste using alpha as mask
        return bg.convert("RGB")
    return img


def make_maskable(svg_path: Path, size: int) -> Image.Image:
    """Create a maskable icon: full-bleed background + scaled mark
    within the safe zone (inner 80%).

    Maskable icons must fill the entire canvas (no transparency) so
    platforms can crop to any shape without showing white corners.
    The mark is scaled to 80% and centered, leaving a 10% padding
    as the safe-zone margin.
    """
    # Full-bleed slate-900 background
    canvas = Image.new("RGBA", (size, size), SLATE_900 + (255,))

    # Render the mark at 80% size (safe zone)
    mark_size = int(size * 0.80)
    mark = render_svg_to_png(svg_path, mark_size)

    # The SVG already has a slate-900 background — we only want the Z
    # glyph and the spark, not the rounded square (which would create
    # a square-in-square effect). Replace slate-900 pixels with transparent.
    pixels = mark.load()
    for y in range(mark.height):
        for x in range(mark.width):
            r, g, b, a = pixels[x, y]
            # Match slate-900 (allow small tolerance for anti-aliasing)
            if abs(r - 15) < 20 and abs(g - 23) < 20 and abs(b - 42) < 20:
                pixels[x, y] = (0, 0, 0, 0)

    # Center-paste the mark on the full-bleed background
    offset = (size - mark_size) // 2
    canvas.paste(mark, (offset, offset), mark)

    return canvas.convert("RGB")


# ── Main ───────────────────────────────────────────────────


def main() -> None:
    if not SVG_PATH.exists():
        raise SystemExit(f"Source SVG not found: {SVG_PATH}")

    print(f"Generating ShopFinder icons from {SVG_PATH.name}…")

    # ── favicon.ico (legacy fallback, 32×32) ──────────────
    # Modern browsers use icon.svg (scalable). This ICO is a fallback for
    # legacy browsers and bookmarks. Single resolution keeps the file tiny.
    ico_img = render_svg_to_png(SVG_PATH, 32)
    ico_path = PUBLIC_DIR / "favicon.ico"
    ico_img.save(ico_path, format="ICO")
    print(f"  ✓ {ico_path.relative_to(ROOT)}  (32×32, legacy fallback)")

    # ── apple-touch-icon.png (180×180) ────────────────────
    # Apple recommends a solid background (no transparency) for touch icons.
    apple = render_svg_to_png(SVG_PATH, 180, bg_color=SLATE_900)
    apple_path = PUBLIC_DIR / "apple-touch-icon.png"
    apple.save(apple_path, format="PNG", optimize=True)
    print(f"  ✓ {apple_path.relative_to(ROOT)}  (180×180)")

    # ── favicon-16.png and favicon-32.png (modern PNG favicons) ──
    # Used by browsers that prefer PNG over ICO. Paired with icon.svg
    # (scalable) for the full favicon strategy.
    for size in (16, 32):
        img = render_svg_to_png(SVG_PATH, size)
        path = PUBLIC_DIR / f"favicon-{size}.png"
        img.save(path, format="PNG", optimize=True)
        print(f"  ✓ {path.relative_to(ROOT)}  ({size}x{size})")

    # ── PWA standard icons ────────────────────────────────
    for size in (192, 512):
        img = render_svg_to_png(SVG_PATH, size)
        path = PUBLIC_DIR / f"icon-{size}.png"
        img.save(path, format="PNG", optimize=True)
        print(f"  ✓ {path.relative_to(ROOT)}  ({size}x{size})")

    # ── Maskable icons (full-bleed + safe zone) ───────────
    for size in (192, 512):
        img = make_maskable(SVG_PATH, size)
        path = PUBLIC_DIR / f"icon-maskable-{size}.png"
        img.save(path, format="PNG", optimize=True)
        print(f"  ✓ {path.relative_to(ROOT)}  ({size}x{size}, maskable)")

    print("\nAll icons generated. Wired into RootLayout via <link> tags.")
    print("Favicon strategy (modern best practice):")
    print("  - icon.svg           (scalable, primary)")
    print("  - favicon-32.png     (32×32 PNG fallback)")
    print("  - favicon-16.png     (16×16 PNG fallback)")
    print("  - favicon.ico        (legacy ICO fallback)")
    print("  - apple-touch-icon.png  (iOS home screen)")
    print("  - icon-192/512.png      (PWA standard)")
    print("  - icon-maskable-192/512 (PWA maskable with safe zone)")


if __name__ == "__main__":
    main()
