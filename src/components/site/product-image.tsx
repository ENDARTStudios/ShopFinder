"use client";

import * as React from "react";

/**
 * ProductImage — foto real via Wikimedia Commons com fallback honesto.
 *
 * - Busca a primeira IMAGEM (namespace File, gsrnamespace=6) do termo
 *   (marca + título) na Commons API (sem key, CORS via origin=*), thumb
 *   de 640px, timeout de 3s.
 * - Cache em sessionStorage: "sf:img:<query>" — hit com URL reutiliza;
 *   cache negativo (string vazia) apenas para 200-sem-imagem (miss real).
 *   Erro de rede/CSP/timeout NÃO cacheia — retry no próximo load.
 * - Qualquer erro/vazio/timeout renderiza o gradiente + label atual,
 *   sem layout quebrado e sem foto de outro produto.
 * - <img> com width/height fixos (zero CLS), lazy e no-referrer.
 */

const CACHE_PREFIX = "sf:img:";
const TIMEOUT_MS = 3000;

function buildApiUrl(query: string): string {
  return (
    "https://commons.wikimedia.org/w/api.php?action=query&generator=search" +
    `&gsrsearch=${encodeURIComponent(query)}` +
    // namespace 6 = File — sem isso a busca retorna páginas de artigo,
    // que vêm SEM imageinfo/thumburl (validado em T030)
    "&gsrnamespace=6" +
    "&gsrlimit=1&prop=imageinfo&iiprop=url&iiurlwidth=640&format=json&origin=*"
  );
}

function readCache(query: string): string | null | undefined {
  try {
    const cached = sessionStorage.getItem(CACHE_PREFIX + query);
    return cached === null ? undefined : cached || null; // "" (miss) → null
  } catch {
    return undefined;
  }
}

function writeCache(query: string, url: string | null): void {
  try {
    sessionStorage.setItem(CACHE_PREFIX + query, url ?? "");
  } catch {
    // sessionStorage indisponível — segue sem cache
  }
}

interface ProductImageProps {
  /** Termo de busca (marca + título ou categoria). */
  query: string;
  /** Gradiente CSS exibido enquanto carrega e como fallback. */
  gradient: string;
  /** Texto alt e label centralizado do fallback. */
  label: string;
  /** Classes do container visual (ex.: "absolute inset-0"). */
  className?: string;
}

export function ProductImage({ query, gradient, label, className = "" }: ProductImageProps) {
  const [state, setState] = React.useState<{
    query: string;
    src: string | null;
    resolved: boolean;
  }>(() => {
    const cached = readCache(query);
    return { query, src: cached ?? null, resolved: cached !== undefined };
  });

  // Ajuste de estado durante render (padrão React p/ props derivadas) — evita
  // setState síncrono dentro de effect.
  if (state.query !== query) {
    const cached = readCache(query);
    setState({ query, src: cached ?? null, resolved: cached !== undefined });
  }

  React.useEffect(() => {
    if (state.query !== query || state.resolved) return;

    let alive = true;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    fetch(buildApiUrl(query), { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((json: unknown) => {
        const pages =
          (
            json as {
              query?: { pages?: Record<string, { imageinfo?: Array<{ thumburl?: string }> }> };
            }
          )?.query?.pages ?? {};
        const first = Object.values(pages)[0];
        const thumburl = first?.imageinfo?.[0]?.thumburl ?? null;
        // Cache negativo SOMENTE para 200-sem-imagem (miss real do catálogo
        // da Commons) — evita refetch spam sem eternizar falhas transitórias.
        writeCache(query, thumburl);
        if (alive) setState({ query, src: thumburl, resolved: true });
      })
      .catch(() => {
        // Erro de rede/CSP/timeout: NÃO cacheia — tenta de novo no próximo load.
        if (alive) setState({ query, src: null, resolved: true });
      })
      .finally(() => clearTimeout(timer));

    return () => {
      alive = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, state.query, state.resolved]);

  const src = state.query === query ? state.src : null;

  return (
    <div className={className} style={{ background: gradient }}>
      {src ? (
        <img
          src={src}
          alt={label}
          width={640}
          height={480}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center px-2">
          <span className="text-center text-sm font-bold text-white/90 sm:text-base">{label}</span>
        </div>
      )}
    </div>
  );
}
