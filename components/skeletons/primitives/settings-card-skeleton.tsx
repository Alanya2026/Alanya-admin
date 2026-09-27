import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { stagger } from "./stagger";

export function SettingsCardSkeleton({
  fields = 2,
  withButton = true,
  index = 0,
}: {
  fields?: number;
  withButton?: boolean;
  index?: number;
}) {
  const delay = stagger(index);

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" style={{ animationDelay: delay }} />
          <Skeleton className="h-5 w-24 rounded" style={{ animationDelay: delay }} />
        </div>
        <Skeleton className="h-3 w-48 rounded mt-2" style={{ animationDelay: delay }} />
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-28 rounded" style={{ animationDelay: stagger(index + i + 1) }} />
            <Skeleton className="h-10 w-full rounded-md" style={{ animationDelay: stagger(index + i + 1) }} />
          </div>
        ))}
        {withButton && (
          <Skeleton className="h-10 w-32 rounded-md" style={{ animationDelay: stagger(index + fields + 1) }} />
        )}
      </CardContent>
    </Card>
  );
}

export function SettingsPageSkeleton() {
  return (
    <div
      className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      aria-busy="true"
      aria-label="Chargement des paramètres"
    >
      <SettingsCardSkeleton fields={2} withButton index={0} />
      <SettingsCardSkeleton fields={1} withButton={false} index={1} />
      <SettingsCardSkeleton fields={1} withButton={false} index={2} />
      <SettingsCardSkeleton fields={0} withButton={false} index={3} />
      <SettingsCardSkeleton fields={0} withButton={false} index={4} />
    </div>
  );
}
