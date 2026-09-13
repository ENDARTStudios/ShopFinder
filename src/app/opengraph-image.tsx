/**
 * ShopFinder — Open Graph image (1200×630).
 * Search bar as protagonist. Product discovery, not technical docs.
 */
import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt =
  "ShopFinder — compra inteligente. Encontre qualquer componente de hardware entre milhares de fornecedores.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 40,
        background: "#0F172A",
        backgroundImage:
          "radial-gradient(800px 400px at 50% 0%, rgba(16,185,129,0.15), transparent 60%)",
        fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif",
        color: "#FFFFFF",
        padding: 80
      }}
    >
      {/* Brand: magnifying glass mark + wordmark */}
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        {/* Magnifying glass mark */}
        <div style={{ width: 56, height: 56, position: "relative", display: "flex" }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              border: "6px solid #10B981",
              position: "absolute",
              top: 0,
              left: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#10B981" }} />
          </div>
          <div
            style={{
              position: "absolute",
              bottom: 0,
              right: 0,
              width: 24,
              height: 8,
              background: "#10B981",
              borderRadius: 4,
              transform: "rotate(45deg)"
            }}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 36, fontWeight: 900, letterSpacing: "-0.02em" }}>
            ShopFinder
          </span>
          <span
            style={{ fontSize: 16, fontWeight: 500, color: "#10B981", letterSpacing: "0.08em" }}
          >
            compra inteligente
          </span>
        </div>
      </div>

      {/* Headline */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12
        }}
      >
        <div
          style={{ fontSize: 56, fontWeight: 900, letterSpacing: "-0.03em", textAlign: "center" }}
        >
          Encontre qualquer componente
        </div>
        <div style={{ fontSize: 28, fontWeight: 400, color: "#94A3B8", textAlign: "center" }}>
          entre milhares de fornecedores
        </div>
      </div>

      {/* Search bar mockup */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          width: 800,
          height: 64,
          borderRadius: 32,
          background: "#1E293B",
          border: "1px solid rgba(255,255,255,0.1)",
          padding: "0 24px",
          gap: 16
        }}
      >
        {/* Search icon */}
        <div
          style={{ width: 24, height: 24, position: "relative", flexShrink: 0, display: "flex" }}
        >
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: "50%",
              border: "3px solid #94A3B8",
              position: "absolute",
              top: 0,
              left: 0
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 0,
              right: 0,
              width: 10,
              height: 3,
              background: "#94A3B8",
              borderRadius: 2,
              transform: "rotate(45deg)"
            }}
          />
        </div>
        <span style={{ fontSize: 22, color: "#64748B" }}>
          Pesquisar processadores, placas de vídeo, SSD...
        </span>
      </div>

      {/* Suggestion chips */}
      <div style={{ display: "flex", gap: 16 }}>
        {["Intel", "AMD", "RTX 5090", "SSD NVMe", "DDR5"].map((chip) => (
          <div
            key={chip}
            style={{
              display: "flex",
              padding: "8px 20px",
              borderRadius: 20,
              background: "rgba(16, 185, 129, 0.1)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              fontSize: 18,
              fontWeight: 500,
              color: "#10B981"
            }}
          >
            {chip}
          </div>
        ))}
      </div>

      {/* Trust footer — T063: apenas claims verificáveis */}
      <div style={{ display: "flex", gap: 32, fontSize: 16, color: "#64748B" }}>
        <span>Powered by Catalog Intelligence</span>
        <span>·</span>
        <span>Validação em camadas</span>
        <span>·</span>
        <span>7 fornecedores</span>
      </div>
    </div>,
    { ...size }
  );
}
