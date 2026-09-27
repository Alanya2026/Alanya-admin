import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCardGridSkeleton } from "./primitives/stat-card-skeleton";
import { stagger } from "./primitives/stagger";

/**
 * Silhouette de la page « Santé du service » : la rangée de compteurs, le
 * tableau des jobs en échec, puis la liste des purges.
 *
 * Elle suit la même géométrie que la vraie page pour qu'aucun bloc ne saute à
 * l'arrivée des données — sur un écran de surveillance, un déplacement est lu
 * comme un changement d'état.
 */
export function HealthContentSkeleton() {
  return (
    <div className="space-y-6">
      <StatCardGridSkeleton count={4} />

      <Card className="border-0 shadow-sm bg-white dark:bg-zinc-900">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-48 rounded" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-4 w-32 rounded" style={{ animationDelay: stagger(i) }} />
              <Skeleton className="h-4 flex-1 rounded" style={{ animationDelay: stagger(i) }} />
              <Skeleton className="h-4 w-24 rounded" style={{ animationDelay: stagger(i) }} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm bg-white dark:bg-zinc-900">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40 rounded" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-3">
              <Skeleton className="h-4 w-44 rounded" style={{ animationDelay: stagger(i) }} />
              <Skeleton className="h-5 w-20 rounded-full" style={{ animationDelay: stagger(i) }} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
