import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton da tabela de comparação — mantém as larguras das colunas
 * estáveis para CLS = 0 (docs/eng/MOTION-SYSTEM.md §4). O nº de colunas
 * espelha a seleção atual do usuário.
 */
export function CompareTableSkeleton({
  columns = 2,
  rows = 8
}: {
  columns?: number;
  rows?: number;
}) {
  return (
    <Card className="mb-6 overflow-hidden" aria-busy="true" aria-live="polite">
      <CardHeader className="pb-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-64" />
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        <table className="w-full border-collapse text-sm" aria-hidden="true">
          <thead>
            <tr className="border-b border-border/60 bg-muted/20">
              <th className="sticky left-0 z-10 w-44 min-w-44 bg-muted/20 p-3">
                <Skeleton className="h-3 w-20" />
              </th>
              {Array.from({ length: columns }, (_, i) => (
                <th key={i} className="min-w-48 p-3">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
                    <div className="w-full space-y-1.5">
                      <Skeleton className="h-3.5 w-4/5" />
                      <Skeleton className="h-3 w-2/5" />
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }, (_, r) => (
              <tr key={r} className="border-b border-border/40">
                <td className="sticky left-0 z-10 w-44 min-w-44 bg-background p-3">
                  <Skeleton className="h-3 w-24" />
                </td>
                {Array.from({ length: columns }, (_, c) => (
                  <td key={c} className="p-3">
                    <Skeleton className="h-3 w-3/4" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
