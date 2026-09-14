import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton da página de produto — espelha o layout header + 2 colunas
 * (docs/eng/MOTION-SYSTEM.md §4).
 */
export default function ProductLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <Skeleton className="mb-6 h-4 w-32" aria-hidden="true" />

        <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-start">
          <Skeleton className="h-48 w-48 shrink-0 rounded-2xl" />
          <div className="flex-1 space-y-3">
            <div className="flex gap-2">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <Skeleton className="h-9 w-3/4" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-8 w-56" />
            <div className="flex gap-2 pt-1">
              <Skeleton className="h-9 w-32 rounded-md" />
              <Skeleton className="h-9 w-32 rounded-md" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="rounded-xl border border-border/40">
              <div className="border-b border-border/40 p-6">
                <Skeleton className="h-5 w-56" />
              </div>
              <div className="space-y-3 p-6">
                {Array.from({ length: 4 }, (_, i) => (
                  <div key={i} className="space-y-2 rounded-lg border border-border/40 p-3">
                    <div className="flex justify-between">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-4 w-20 rounded-full" />
                    </div>
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-1 w-full rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <div className="rounded-xl border border-border/40 p-6">
              <Skeleton className="mb-4 h-4 w-40" />
              <div className="space-y-3">
                {Array.from({ length: 3 }, (_, i) => (
                  <div key={i} className="rounded-lg border border-border/40 p-3">
                    <div className="mb-2 flex justify-between">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-16 rounded-full" />
                    </div>
                    <Skeleton className="h-5 w-20" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
