import { useQuery } from "@tanstack/react-query";
import { fetchServiceHealth } from "@/lib/api/health";

const KEY = ["admin-health"];

/**
 * Contrairement aux autres écrans, celui-ci se rafraîchit tout seul : on l'ouvre
 * pour surveiller, souvent pendant qu'on agit ailleurs (relance d'un job,
 * redémarrage). Une page figée sur l'état d'il y a dix minutes induirait en
 * erreur au pire moment.
 *
 * 30 s : assez pour suivre, assez espacé pour que la page ne pèse rien — la
 * route interroge la base à chaque appel.
 */
export function useServiceHealth() {
  return useQuery({
    queryKey: KEY,
    queryFn: fetchServiceHealth,
    refetchInterval: 30_000,
  });
}
