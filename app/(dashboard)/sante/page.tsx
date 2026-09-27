"use client";

import { Activity, AlertTriangle, Clock, Database, Layers, Server } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { HealthContentSkeleton } from "@/components/skeletons";
import { useServiceHealth } from "@/hooks/useHealth";
import type { PurgeDernierPassage } from "@/types";

/**
 * Santé du service.
 *
 * Cette page ne remplace pas l'alerte : personne ne regarde un tableau de bord
 * à trois heures du matin. Elle montre ce qu'aucune sonde externe ne peut voir
 * — un job de fond qui échoue en silence, une purge qui ne tourne plus, un pool
 * de connexions qui sature. Dans ces trois cas, le serveur répond parfaitement.
 */

const JOUR_MS = 24 * 60 * 60 * 1000;

/** Au-delà, une purge quotidienne a manifestement cessé de tourner. */
const PURGE_EN_RETARD_MS = 2 * JOUR_MS;

function dateCourte(iso: string | null) {
  if (!iso) return "jamais";
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function depuis(iso: string | null) {
  if (!iso) return null;
  return Date.now() - new Date(iso).getTime();
}

/**
 * Trois états, pas deux. « Jamais exécutée » et « en retard » se distinguent :
 * la première n'a peut-être jamais été câblée, la seconde s'est arrêtée. Le
 * diagnostic n'est pas le même.
 */
function etatPurge(p: PurgeDernierPassage): { libelle: string; variante: "default" | "secondary" | "destructive" | "outline" } {
  if (!p.dernierPassage) return { libelle: "jamais exécutée", variante: "destructive" };
  if (p.ok === false) return { libelle: "en échec", variante: "destructive" };
  const age = depuis(p.dernierPassage)!;
  if (age > PURGE_EN_RETARD_MS) return { libelle: "en retard", variante: "destructive" };
  return { libelle: "à jour", variante: "secondary" };
}

export default function SantePage() {
  const { data, isLoading, isFetching, isError, refetch } = useServiceHealth();

  // Même règle que la page Purges : le squelette n'apparaît qu'au tout premier
  // chargement. Cette page se rafraîchit toute seule toutes les 30 s — la faire
  // clignoter à chaque cycle la rendrait illisible.
  const showSkeleton = isLoading || (isFetching && !data);

  if (showSkeleton) return <div className="p-6"><HealthContentSkeleton /></div>;
  if (isError || !data) {
    return (
      <div className="p-6">
        <ErrorState
          onRetry={() => refetch()}
          message="L'état du service n'a pas pu être récupéré."
        />
      </div>
    );
  }

  const { jobs, purges, redis, mysql } = data;
  const purgesEnAlerte = purges.filter((p) => etatPurge(p).variante === "destructive");

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Santé du service</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Les traitements de fond et les dépendances. Actualisé automatiquement —
          dernière lecture {dateCourte(data.timestamp)}.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Jobs en attente"
          value={jobs.enAttente}
          icon={Layers}
          subtitle={jobs.workerActif ? "worker actif" : "worker à l'arrêt"}
        />
        <StatCard
          title="Jobs en échec"
          value={jobs.enEchec}
          icon={AlertTriangle}
          subtitle={jobs.enEchec > 0 ? "à examiner" : "aucun"}
        />
        <StatCard
          title="Purges à surveiller"
          value={purgesEnAlerte.length}
          icon={Clock}
          subtitle={`sur ${purges.length} purges`}
        />
        <StatCard
          title="Connexions MySQL"
          value={mysql.mesurable ? `${mysql.occupees}/${mysql.taille}` : "—"}
          icon={Database}
          subtitle={
            mysql.mesurable
              ? (mysql.enAttente! > 0 ? `${mysql.enAttente} requête(s) en attente` : "pool disponible")
              : "compteurs indisponibles"
          }
        />
      </div>

      <Card className="border-0 shadow-sm bg-white dark:bg-zinc-900">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Server className="h-4 w-4" /> Dépendances
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-6">
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-500">Redis</span>
            {!redis.configure ? (
              <Badge variant="outline">non configuré</Badge>
            ) : (
              <Badge variant={redis.connecte ? "secondary" : "destructive"}>
                {redis.connecte ? "connecté" : "injoignable"}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-500">Worker de jobs</span>
            <Badge variant={jobs.workerActif ? "secondary" : "destructive"}>
              {jobs.workerActif ? "actif" : "arrêté"}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-500">Jobs verrouillés</span>
            <Badge variant="outline">{jobs.verrouilles}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm bg-white dark:bg-zinc-900">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> Derniers jobs en échec
          </CardTitle>
        </CardHeader>
        <CardContent>
          {jobs.derniersEchecs.length === 0 ? (
            <p className="text-sm text-zinc-400 py-4">
              Aucun job en échec. Ces lignes restent en base une fois leurs tentatives
              épuisées : une liste vide signifie bien que rien n&apos;a définitivement échoué.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Échoué le</TableHead>
                    <TableHead>Tentatives</TableHead>
                    <TableHead>Erreur</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.derniersEchecs.map((j) => (
                    <TableRow key={j.id}>
                      <TableCell className="font-medium whitespace-nowrap">{j.kind}</TableCell>
                      <TableCell className="whitespace-nowrap">{dateCourte(j.echoueLe)}</TableCell>
                      <TableCell className="whitespace-nowrap">{j.tentatives}/{j.tentativesMax}</TableCell>
                      <TableCell className="text-xs text-zinc-500 max-w-md truncate" title={j.erreur || ""}>
                        {j.erreur || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm bg-white dark:bg-zinc-900">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" /> Dernier passage des purges
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {purges.map((p) => {
            const etat = etatPurge(p);
            return (
              <div
                key={p.name}
                className="flex items-center justify-between gap-3 py-2 border-b border-zinc-100 dark:border-zinc-800 last:border-0"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{p.name}</p>
                  <p className="text-xs text-zinc-500">
                    {dateCourte(p.dernierPassage)}
                    {p.erreur ? ` — ${p.erreur}` : ""}
                  </p>
                </div>
                <Badge variant={etat.variante}>{etat.libelle}</Badge>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
