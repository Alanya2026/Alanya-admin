// Server Component — squelette de chargement de route (boundary RSC).
//
// Il n'a PAS de directive "use client" : ce fragment est rendu côté serveur
// pendant la navigation, sans aucun JS client. Réutilisé par les loading.tsx
// des routes "liste" — voir la note RSC dans app/(dashboard)/loading.tsx.
import { Skeleton } from "@/components/ui/skeleton";
import { UsersTableSectionSkeleton } from "./primitives/table-skeleton";

export function PageLoadingSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>
      <UsersTableSectionSkeleton count={count} />
    </div>
  );
}
