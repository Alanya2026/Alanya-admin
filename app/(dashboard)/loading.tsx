// Server Component — boundary de chargement (RSC) du tableau de bord.
//
// Point minimal d'introduction des Serveur Components sur les routes : ce
// fichier n'a pas de directive "use client" et n'embarque aucun JS client.
// Il est rendu côté serveur pendant la navigation entre les routes, en
// attendant que la page (react-query) livre ses données.
// Les routes avec un squelette dédié (dashboard, analytics, geolocation,
// welcome) fournissent leur propre loading.tsx, qui prime sur celui-ci.
import { PageLoadingSkeleton } from "@/components/skeletons/page-loading";

export default function DashboardRouteLoading() {
  return <PageLoadingSkeleton />;
}
