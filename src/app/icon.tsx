/**
 * ShopFinder — Favicon (32×32). Minimal magnifying glass.
 * Emerald lens ring + "found" dot + 45° handle.
 */
import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0F172A",
        borderRadius: "28%",
        position: "relative"
      }}
    >
      {/* Lens ring */}
      <div
        style={{
          width: 16,
          height: 16,
          borderRadius: "50%",
          border: "3px solid #10B981",
          position: "absolute",
          top: 5,
          left: 5,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        {/* Found dot */}
        <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#10B981" }} />
      </div>
      {/* Handle */}
      <div
        style={{
          position: "absolute",
          bottom: 4,
          right: 4,
          width: 10,
          height: 4,
          background: "#10B981",
          borderRadius: 2,
          transform: "rotate(45deg)"
        }}
      />
    </div>,
    { ...size }
  );
}
