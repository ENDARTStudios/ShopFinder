/**
 * ShopFinder — Open Graph dinâmico de produto (T076).
 *
 * 1200×630 com: badge ShopFinder, título, preço em BRL (câmbio USD→BRL com
 * fallback documentado), fornecedor do menor preço e contagem de ofertas.
 * Imagens remotas do fornecedor NÃO são embutidas (hotlink instável no
 * render de OG) — o card é tipográfico sobre o gradiente da marca.
 */
import { ImageResponse } from "next/og";
import { prisma } from "@workspace/database/client";
import { getUsdBrlRate } from "@/lib/fx-server";
import { minorUnitsToNumber } from "@/lib/price";

export const runtime = "nodejs";
export const alt = "ShopFinder — compare preços, specs e disponibilidade";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";


function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c] ?? c
  );
}

export default async function Image({ params }: { params: { slug: string } }) {
  const product = await prisma.product.findFirst({
    where: { slug: params.slug, deletedAt: null, status: "published" },
    include: {
      offers: {
        where: { deletedAt: null },
        orderBy: { priceMinorUnits: "asc" },
        include: { supplier: true }
      }
    }
  });

  if (!product) {
    return new ImageResponse(
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0F172A",
          color: "#FFFFFF",
          fontSize: 48
        }}
      >
        ShopFinder
      </div>,
      size
    );
  }

  const rate = await getUsdBrlRate();
  const prices = product.offers.map((o) => minorUnitsToNumber(o.priceMinorUnits));
  const min = Math.min(...prices);
  const brl = min * rate;
  const supplier =
    product.offers.find((o) => minorUnitsToNumber(o.priceMinorUnits) === min)?.supplier?.name ??
    "";

  const title = product.title.length > 90 ? `${product.title.slice(0, 87)}…` : product.title;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#0F172A",
        backgroundImage:
          "radial-gradient(900px 450px at 50% 0%, rgba(16,185,129,0.15), transparent 60%)",
        padding: 70,
        color: "#FFFFFF",
        fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif"
      }}
    >
      {/* Badge ShopFinder */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            background: "#10B981",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#0F172A",
            fontSize: 26,
            fontWeight: 900
          }}
        >
          S
        </div>
        <span style={{ fontSize: 30, fontWeight: 800 }}>ShopFinder</span>
      </div>

      {/* Título + preço */}
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div
          style={{
            fontSize: 56,
            fontWeight: 900,
            lineHeight: 1.15,
            display: "flex",
            flexDirection: "column"
          }}
        >
          {escapeXml(title)}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 24 }}>
          <span style={{ fontSize: 64, fontWeight: 900, color: "#10B981" }}>
            R$ {(brl).toFixed(2).replace(".", ",")}
          </span>
          <span style={{ fontSize: 28, color: "#94A3B8" }}>
            US$ {min.toFixed(2)}
          </span>
        </div>
        <div style={{ display: "flex", gap: 14, fontSize: 24, color: "#94A3B8" }}>
          <span>{escapeXml(supplier)}</span>
          <span>·</span>
          <span>
            {product.offers.length} {product.offers.length === 1 ? "oferta" : "ofertas"}
          </span>
        </div>
      </div>

      {/* Rodapé */}
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22, color: "#64748B" }}>
        <span>shop-finder-taupe.vercel.app</span>
        <span>Compare antes de contratar</span>
      </div>
    </div>,
    size
  );
}
