import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeletons dos painéis admin — espelham o layout final
 * (docs/eng/MOTION-SYSTEM.md §4: "Admin/pipeline: skeleton de cards
 * de status"), substituindo spinners centralizados.
 */

export function AdminDashboardSkeleton() {
  return (
    <div className="min-h-screen bg-background" aria-busy="true" aria-live="polite">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>

        {/* Summary cards */}
        <div
          className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7"
          aria-hidden="true"
        >
          {Array.from({ length: 7 }, (_, i) => (
            <Card key={i} className="p-3">
              <Skeleton className="mb-1 h-3 w-16" />
              <Skeleton className="h-6 w-10" />
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="mb-4 flex flex-wrap gap-2" aria-hidden="true">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-md" />
          ))}
        </div>

        {/* Products table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm" aria-hidden="true">
                <thead className="border-b bg-muted/30">
                  <tr className="text-left">
                    {Array.from({ length: 8 }, (_, i) => (
                      <th key={i} className="px-3 py-2">
                        <Skeleton className="h-3 w-16" />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 6 }, (_, r) => (
                    <tr key={r} className="border-b">
                      <td className="px-3 py-2">
                        <Skeleton className="mb-1 h-4 w-48" />
                        <Skeleton className="h-3 w-24" />
                      </td>
                      <td className="px-3 py-2">
                        <Skeleton className="h-5 w-20 rounded-full" />
                      </td>
                      <td className="px-3 py-2">
                        <Skeleton className="h-3 w-16" />
                      </td>
                      <td className="px-3 py-2">
                        <Skeleton className="ml-auto h-3 w-10" />
                      </td>
                      <td className="px-3 py-2">
                        <Skeleton className="ml-auto h-3 w-10" />
                      </td>
                      <td className="px-3 py-2">
                        <Skeleton className="ml-auto h-3 w-14" />
                      </td>
                      <td className="px-3 py-2">
                        <Skeleton className="ml-auto h-3 w-8" />
                      </td>
                      <td className="px-3 py-2">
                        <Skeleton className="h-7 w-32 rounded-md" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/** Pipeline status: skeleton de cards de status dos conectores + estágios. */
export function PipelineStatusSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite">
      <section className="mb-8">
        <Skeleton className="mb-3 h-4 w-24" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
          {Array.from({ length: 6 }, (_, i) => (
            <Card key={i}>
              <div className="flex items-center justify-between p-6 pb-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-24 rounded-full" />
              </div>
              <CardContent className="space-y-2">
                {Array.from({ length: 4 }, (_, j) => (
                  <div key={j} className="flex items-center justify-between">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
