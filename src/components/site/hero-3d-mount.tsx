"use client";

/**
 * ShopFinder — Gate de montagem do Hero 3D (#32)
 *
 * Monta o canvas R3F somente quando: (1) o hero está no viewport
 * (IntersectionObserver), (2) o usuário não ativou prefers-reduced-motion.
 * O dynamic import mantém three.js fora do bundle inicial.
 */
import * as React from "react";
import dynamic from "next/dynamic";

const Hero3D = dynamic(() => import("./hero-3d"), { ssr: false });

export function Hero3DMount() {
  const ref = React.useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = ref.current;
    if (!el) return;

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
  }, []);

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
