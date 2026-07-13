/**
 * ShopFinder — Twitter Card image (1200×600).
 * Search-first, product discovery experience.
 */
import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt =
  "ShopFinder — compra inteligente. Encontre componentes de hardware entre milhares de fornecedores.";
export const size = { width: 1200, height: 600 };
export const contentType = "image/png";

export default function TwitterImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 32,
        background: "#0F172A",
        backgroundImage:
          "radial-gradient(700px 350px at 50% 20%, rgba(16,185,129,0.18), transparent 60%)",
        fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif",
        color: "#FFFFFF",
        padding: 60
      }}
    >
      {/* Brand mark — magnifying glass */}
      <div style={{ width: 72, height: 72, position: "relative", display: "flex" }}>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            border: "8px solid #10B981",
            position: "absolute",
            top: 0,
            left: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#10B981" }} />
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 0,
            right: 0,
            width: 32,
            height: 10,
            background: "#10B981",
            borderRadius: 5,
            transform: "rotate(45deg)"
          }}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
        <div style={{ fontSize: 64, fontWeight: 900, letterSpacing: "-0.03em" }}>ShopFinder</div>
        <div style={{ fontSize: 24, fontWeight: 600, color: "#10B981", letterSpacing: "0.12em" }}>
          compra inteligente
        </div>
      </div>

      <div style={{ fontSize: 26, fontWeight: 400, color: "#94A3B8", textAlign: "center" }}>
        Encontre qualquer componente de hardware
      </div>

      {/* Search bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          width: 600,
          height: 52,
          borderRadius: 26,
          background: "#1E293B",
          border: "1px solid rgba(255,255,255,0.1)",
          padding: "0 20px",
          gap: 12
        }}
      >
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: "50%",
            border: "3px solid #94A3B8",
            flexShrink: 0
          }}
        />
        <span style={{ fontSize: 18, color: "#64748B" }}>Pesquisar hardware...</span>
      </div>
    </div>,
    { ...size }
  );
}
