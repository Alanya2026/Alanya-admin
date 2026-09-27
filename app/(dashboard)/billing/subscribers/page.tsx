"use client";

/**
 * Abonnés Alanya Plus, par échéance la plus proche.
 *
 * La question qu'on vient poser ici est « qui arrive au bout ? » : le filtre
 * par défaut montre les abonnements actifs, triés par date de fin, et la
 * colonne Fin dit l'écart en jours à côté de la date.
 */

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BillingPageHeader, FilterChips } from "@/components/billing/BillingPageHeader";
import { usePermissions } from "@/hooks/usePermissions";
import { useBillingPlans, useBillingSubscribers } from "@/hooks/useBilling";
import { channelLabel, fmtDay, planLabel } from "@/lib/billing-labels";
import { cn } from "@/lib/utils";
import type { BillingSubscriberFilter } from "@/types";

const DAY = 86_400_000;

const FILTERS: { value: BillingSubscriberFilter; label: string }[] = [
  { value: "active", label: "Actifs" },
  { value: "expiring", label: "Échéance sous 30 jours" },
  { value: "expired", label: "Terminés" },
  { value: "all", label: "Tous" },
];

const EMPTY: Record<BillingSubscriberFilter, string> = {
  active: "Aucun abonnement actif.",
  expiring: "Aucune échéance dans les 30 prochains jours.",
  expired: "Aucun abonnement terminé.",
  all: "Personne ne s'est encore abonné.",
};

/** « dans 5 j », « aujourd'hui », « il y a 3 j ». */
function relative(end: string): { text: string; tone: "ok" | "soon" | "past" } {
  const days = Math.ceil((new Date(end).getTime() - Date.now()) / DAY);
  if (days > 0) return { text: `dans ${days} j`, tone: days <= 7 ? "soon" : "ok" };
  if (days === 0) return { text: "aujourd'hui", tone: "soon" };
  return { text: `il y a ${-days} j`, tone: "past" };
}

export default function BillingSubscribersPage() {
  const { can } = usePermissions();
  const [filter, setFilter] = useState<BillingSubscriberFilter>("active");
  const { data, isLoading, isFetching, isError, refetch } = useBillingSubscribers(filter);
  const { data: plans } = useBillingPlans();
  const rows = data ?? [];

  if (!can("billing.read")) {
    return <p className="py-20 text-center text-sm text-zinc-500">Accès réservé à l&apos;équipe d&apos;administration.</p>;
  }

  return (
    <div className="space-y-6">
      <BillingPageHeader
        subtitle="Qui est abonné, jusqu'à quand, et qui renouvelle automatiquement."
        refreshing={isFetching}
        onRefresh={() => refetch()}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FilterChips label="Filtrer les abonnés" options={FILTERS} value={filter} onChange={setFilter} />
        {data && (
          <p className="text-sm text-zinc-500 tabular-nums dark:text-zinc-400">
            {rows.length} compte{rows.length > 1 ? "s" : ""}
            {rows.length >= 200 && " (200 premiers)"}
          </p>
        )}
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {isError ? (
            <div className="py-12 text-center">
              <p className="mb-3 text-sm text-red-500">Impossible de charger les abonnés.</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>Réessayer</Button>
            </div>
          ) : isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : rows.length === 0 ? (
            <p className="py-12 text-center text-sm text-zinc-500">{EMPTY[filter]}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Compte</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Fin</TableHead>
                  <TableHead>Renouvellement</TableHead>
                  <TableHead>Données conservées jusqu&apos;au</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const rel = relative(r.currentEnd);
                  return (
                    <TableRow key={r.alanyaId}>
                      <TableCell>
                        <Link
                          href={`/users/${r.alanyaId}`}
                          className="font-medium text-zinc-900 hover:text-indigo-600 hover:underline dark:text-zinc-100"
                        >
                          {r.userName || `Compte ${r.alanyaId}`}
                        </Link>
                        <span className="block text-xs text-zinc-400 tabular-nums">#{r.alanyaId}</span>
                      </TableCell>
                      <TableCell className="text-sm">{planLabel(r.plan, plans)}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        <span className="text-sm tabular-nums">{fmtDay(r.currentEnd)}</span>
                        <span
                          className={cn(
                            "block text-xs tabular-nums",
                            rel.tone === "ok" && "text-zinc-400",
                            rel.tone === "soon" && "font-medium text-amber-600 dark:text-amber-400",
                            rel.tone === "past" && "text-red-600 dark:text-red-400",
                          )}
                        >
                          {rel.text}
                        </span>
                      </TableCell>
                      <TableCell>
                        {r.autoRenew ? (
                          <Badge className="border-0 bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                            Automatique{r.renewChannel ? ` · ${channelLabel(r.renewChannel)}` : ""}
                          </Badge>
                        ) : (
                          <span className="text-sm text-zinc-500">Manuel</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm tabular-nums text-zinc-500">
                        {r.purgeAfter ? fmtDay(r.purgeAfter) : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
