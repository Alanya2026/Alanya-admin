"use client";

/**
 * Paiements Alanya Plus, les plus récents d'abord.
 *
 * Un paiement n'est « réussi » que lorsque le fournisseur l'a confirmé : une
 * ligne « en attente » est une demande, pas de l'argent. Le total ne compte
 * donc que les réussis, et sur les lignes affichées seulement — il le dit.
 */

import { useState } from "react";
import Link from "next/link";
import { FlaskConical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BillingPageHeader, FilterChips } from "@/components/billing/BillingPageHeader";
import { usePermissions } from "@/hooks/usePermissions";
import { useBillingPayments, useBillingPlans } from "@/hooks/useBilling";
import {
  FAILURE_LABEL, PAYMENT_STATUS_CLASS, PAYMENT_STATUS_LABEL, channelLabel, fmtDateTime, paymentItemLabel,
} from "@/lib/billing-labels";
import { formatFcfa } from "@/lib/plan-pricing";
import { cn } from "@/lib/utils";
import type { BillingPaymentStatus } from "@/types";

const FILTERS: { value: BillingPaymentStatus | undefined; label: string }[] = [
  { value: undefined, label: "Tous" },
  { value: "succeeded", label: "Réussis" },
  { value: "pending", label: "En attente" },
  { value: "failed", label: "Échoués" },
  { value: "expired", label: "Expirés" },
];

export default function BillingPaymentsPage() {
  const { can } = usePermissions();
  const [status, setStatus] = useState<BillingPaymentStatus | undefined>(undefined);
  const { data, isLoading, isFetching, isError, refetch } = useBillingPayments(status);
  const { data: plans } = useBillingPlans();

  const rows = data ?? [];
  const succeeded = rows.filter((r) => r.status === "succeeded");
  const total = succeeded.reduce((sum, r) => sum + r.amount, 0);
  const simulated = rows.some((r) => r.provider === "simulated");

  if (!can("billing.read")) {
    return <p className="py-20 text-center text-sm text-zinc-500">Accès réservé à l&apos;équipe d&apos;administration.</p>;
  }

  return (
    <div className="space-y-6">
      <BillingPageHeader
        subtitle="Les paiements mobile money, tels que le fournisseur les a confirmés."
        refreshing={isFetching}
        onRefresh={() => refetch()}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FilterChips label="Filtrer par statut" options={FILTERS} value={status} onChange={setStatus} />
        {data && (
          <p className="text-sm text-zinc-500 tabular-nums dark:text-zinc-400">
            {succeeded.length} réussi{succeeded.length > 1 ? "s" : ""} ·{" "}
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">{formatFcfa(total)}</span>
            <span className="ml-1 text-xs">sur les {rows.length} ligne{rows.length > 1 ? "s" : ""} affichée{rows.length > 1 ? "s" : ""}</span>
          </p>
        )}
      </div>

      {simulated && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <span>
            Fournisseur <span className="font-mono">simulated</span> : ces paiements n&apos;ont débité personne.
            Ils servent à éprouver le parcours avant le branchement de l&apos;agrégateur.
          </span>
        </div>
      )}

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {isError ? (
            <div className="py-12 text-center">
              <p className="mb-3 text-sm text-red-500">Impossible de charger les paiements.</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>Réessayer</Button>
            </div>
          ) : isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : rows.length === 0 ? (
            <p className="py-12 text-center text-sm text-zinc-500">
              {status ? "Aucun paiement avec ce statut." : "Aucun paiement pour l'instant."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Compte</TableHead>
                  <TableHead>Achat</TableHead>
                  <TableHead>Moyen</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Référence</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap text-xs tabular-nums text-zinc-500">
                      {fmtDateTime(r.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/users/${r.alanyaId}`}
                        className="font-medium text-zinc-900 hover:text-indigo-600 hover:underline dark:text-zinc-100"
                      >
                        {r.userName || `Compte ${r.alanyaId}`}
                      </Link>
                      <span className="block text-xs text-zinc-400 tabular-nums">#{r.alanyaId}</span>
                    </TableCell>
                    <TableCell className="text-sm">{paymentItemLabel(r, plans)}</TableCell>
                    <TableCell className="text-sm">
                      {channelLabel(r.channel)}
                      {r.msisdn && <span className="block font-mono text-xs text-zinc-400">{r.msisdn}</span>}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{formatFcfa(r.amount)}</TableCell>
                    <TableCell>
                      <Badge className={cn("border-0", PAYMENT_STATUS_CLASS[r.status])}>
                        {PAYMENT_STATUS_LABEL[r.status] ?? r.status}
                      </Badge>
                      {r.failureCode && (
                        <span className="mt-0.5 block text-xs text-zinc-500">
                          {FAILURE_LABEL[r.failureCode] ?? r.failureCode}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[12rem] truncate font-mono text-xs text-zinc-400" title={r.providerRef ?? undefined}>
                      {r.providerRef ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
