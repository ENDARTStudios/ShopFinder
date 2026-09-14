"use client";

/**
 * ShopFinder — Gate de montagem do Hero 3D (#32, T080 progressive enhancement)
 *
 * Monta o canvas R3F somente quando TODAS as condições:
 * 1. Hero no viewport (IntersectionObserver)
 * 2. prefers-reduced-motion desativado
 * 3. WEBGL2 disponível (software-render headless/low-end não monta)
 * 4. hardwareConcurrency ≥ 4 (dispositivos fracos não pagam o custo)
 * 5.idle: hidratação adiada para não competir com o LCP
 * O dynamic import mantém three.js fora do bundle inicial.
 * Escape hatch: NEXT_PUBLIC_DISABLE_3D=1 remove completamente.
 */
import * as React from "react";
import dynamic from "next/dynamic";

const Hero3D = dynamic(() => import("./hero-3d"), { ssr: false });

function canRender3D(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

export function Hero3DMount() {
  const ref = React.useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = React.useState(false);
  const [canRender, setCanRender] = React.useState(false);

  // Escape hatch para ambientes sem WebGL estável (runners E2E headless
  // travam com swiftshader) — fallback estático permanece.
  const disabled = process.env.NEXT_PUBLIC_DISABLE_3D === "1";

  React.useEffect(() => {
    if (disabled) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // T080 — capacidade de render: software-render/low-end não paga o custo 3D.
    if (!canRender3D()) return;
    if ((navigator.hardwareConcurrency ?? 4) < 4) return;
    const el = ref.current;
    if (!el) return;

    setCanRender(true);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setMounted(true);
          observer.disconnect();
        }
      },
      { rootMargin: "120px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [disabled]);

  if (disabled || (mounted && !canRender)) return null;

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-[5] overflow-hidden opacity-70"
    >
      {mounted && <Hero3D />}
    </div>
  );
}
