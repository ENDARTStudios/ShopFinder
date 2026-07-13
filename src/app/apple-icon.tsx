/**
 * ShopFinder — Apple Touch Icon (180×180). Minimal magnifying glass.
 */
import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0F172A",
        position: "relative"
      }}
    >
      {/* Lens ring */}
      <div
        style={{
          width: 84,
          height: 84,
          borderRadius: "50%",
          border: "12px solid #10B981",
          position: "absolute",
          top: 28,
          left: 28,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        {/* Found dot */}
        <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#10B981" }} />
      </div>
      {/* Handle */}
      <div
        style={{
          position: "absolute",
          bottom: 24,
          right: 24,
          width: 52,
          height: 16,
          background: "#10B981",
          borderRadius: 8,
          transform: "rotate(45deg)"
        }}
      />
    </div>,
    { ...size }
  );
}
