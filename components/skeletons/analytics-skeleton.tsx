import {
  AreaChartSkeleton,
  HeatmapChartSkeleton,
  PieChartSkeleton,
  SectionTitleSkeleton,
  StackedBarChartSkeleton,
} from "./primitives/chart-skeletons";
import { StatCardGridSkeleton } from "./primitives/stat-card-skeleton";

/** Contenu analytics (KPIs + sections). Header géré par la page. */
export function AnalyticsContentSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Chargement des analytics">
      <StatCardGridSkeleton count={4} />

      <SectionTitleSkeleton />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <PieChartSkeleton ariaLabel="Chargement messages par type" />
        <div className="lg:col-span-2">
          <AreaChartSkeleton ariaLabel="Chargement messages par jour" />
        </div>
      </div>
      <HeatmapChartSkeleton />

      <SectionTitleSkeleton />
      <StatCardGridSkeleton count={5} className="sm:grid-cols-2 lg:grid-cols-4" />
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
        <PieChartSkeleton ariaLabel="Chargement audio vs vidéo" />
        <PieChartSkeleton ariaLabel="Chargement issue des appels" />
        <PieChartSkeleton ariaLabel="Chargement mode de connexion" />
        <PieChartSkeleton ariaLabel="Chargement réunions" />
      </div>
      <StackedBarChartSkeleton ariaLabel="Chargement appels par jour" />

      <SectionTitleSkeleton />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <StatCardGridSkeleton count={4} className="grid-cols-2 lg:col-span-2 content-start" />
        <PieChartSkeleton ariaLabel="Chargement stories par type" />
      </div>

      <SectionTitleSkeleton />
      <StatCardGridSkeleton count={4} />

      <SectionTitleSkeleton />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <PieChartSkeleton ariaLabel="Chargement répartition par rôle" />
        <PieChartSkeleton ariaLabel="Chargement connexions par système" />
        <PieChartSkeleton ariaLabel="Chargement parc d'appareils" />
      </div>
      <StatCardGridSkeleton count={4} />
    </div>
  );
}

export function AnalyticsPageSkeleton() {
  return <AnalyticsContentSkeleton />;
}

export function AnalyticsRefetchSkeleton() {
  return <AnalyticsContentSkeleton />;
}
