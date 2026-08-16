import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton de card de produto — mesmo layout do conteúdo final
 * para CLS = 0 (docs/eng/MOTION-SYSTEM.md §4).
 */
export function ProductCardSkeleton() {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border/40 p-3" aria-hidden="true">
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-4 w-16" />
      </div>
      <Skeleton className="ml-3 h-4 w-4 shrink-0 rounded-full" />
    </div>
  );
}

export function ProductCardSkeletonGrid({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}
