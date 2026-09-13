import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeletons das seções da landing — espelham o layout final de cada
 * seção para CLS = 0 (docs/eng/MOTION-SYSTEM.md §4), substituindo os
 * spinners de carregamento.
 */

export function NicheGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-3" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="rounded-2xl border border-border/60 p-6">
          <Skeleton className="mb-4 h-14 w-14 rounded-xl" />
          <Skeleton className="mb-2 h-6 w-2/3" />
          <Skeleton className="mb-4 h-4 w-full" />
          <div className="mb-4 flex gap-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: 3 }, (_, j) => (
              <Skeleton key={j} className="h-4 w-14 rounded-full" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function CategoryGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="rounded-2xl border border-border/60 bg-card p-5">
          <Skeleton className="mb-3 h-12 w-12 rounded-xl" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="mt-1 h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

export function TierGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="rounded-2xl border border-border/60 bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="mb-1 h-4 w-1/2" />
          <Skeleton className="mb-3 h-3 w-24" />
          <div className="space-y-2">
            {Array.from({ length: 5 }, (_, j) => (
              <Skeleton key={j} className="h-3 w-full" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Card de produto da landing: bloco de imagem h-40 + linhas de texto +
 * linha de preço (MOTION-SYSTEM §4 — ProductCard skeleton).
 */
export function LandingProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border/60">
      <Skeleton className="h-40 w-full rounded-none" />
      <div className="p-4">
        <div className="mb-1 flex items-center justify-between">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="mb-2 h-5 w-4/5" />
        <div className="mb-3 flex gap-1">
          <Skeleton className="h-4 w-12 rounded-full" />
          <Skeleton className="h-4 w-14 rounded-full" />
        </div>
        <div className="flex items-end justify-between">
          <div>
            <Skeleton className="mb-1 h-6 w-20" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>
      </div>
    </div>
  );
}

export function LandingProductGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <LandingProductCardSkeleton key={i} />
      ))}
    </div>
  );
}
