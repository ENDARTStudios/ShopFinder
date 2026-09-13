import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton do admin — cards de status (docs/eng/MOTION-SYSTEM.md §4).
 */
export default function AdminLoading() {
  return (
    <div className="space-y-6 p-8" aria-busy="true" aria-label="Carregando painel">
      <Skeleton className="h-8 w-56" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="rounded-xl border border-border/40 p-6">
            <Skeleton className="mb-3 h-4 w-24" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="mt-3 h-3 w-40" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-border/40 p-6">
        <Skeleton className="mb-4 h-5 w-48" />
        <div className="space-y-3">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
