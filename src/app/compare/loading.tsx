import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton da tabela de comparação — mantém larguras de coluna (CLS = 0).
 */
export default function CompareLoading() {
  return (
    <div className="min-h-screen bg-background px-4 py-8" aria-busy="true" aria-label="Carregando comparação">
      <Skeleton className="mb-8 h-8 w-64" />
      <div className="overflow-x-auto rounded-xl border border-border/40">
        <div className="min-w-[640px]">
          {Array.from({ length: 6 }, (_, row) => (
            <div
              key={row}
              className="grid grid-cols-[160px_repeat(3,1fr)] gap-4 border-b border-border/40 p-4 last:border-b-0"
            >
              <Skeleton className="h-4 w-28" />
              {Array.from({ length: 3 }, (_, col) => (
                <Skeleton key={col} className="h-4 w-full" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
