"use client";

/**
 * Abonnement — plans et catalogue des fonctionnalités.
 *
 * Tout ce qui fait l'offre se règle ici sans passer par le code : prix,
 * durée, relance, contenu, mise en avant. Seule limite : une fonctionnalité
 * n'existe que si le code sait la verrouiller — le catalogue la montre
 * « à venir » en attendant.
 */

import { useEffect, useState } from "react";
import { CreditCard, Plus, RefreshCw, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { BillingNav } from "@/components/billing/BillingNav";
import { PlanEditor } from "@/components/billing/PlanEditor";
import { usePermissions } from "@/hooks/usePermissions";
import { useBillingFeatures, useBillingPlans, useUpdateBillingFeature } from "@/hooks/useBilling";
import { formatFcfa, periodSuffix } from "@/lib/plan-pricing";
import { cn } from "@/lib/utils";

const serverError = (e: unknown) =>
  (e as { response?: { data?: { error?: string } } })?.response?.data?.error
  || (e instanceof Error ? e.message : undefined);

export default function BillingPlansPage() {
  const { can } = usePermissions();
  const canPlans = can("billing.plans");
  const { addToast } = useToast();
  const plans = useBillingPlans();
  const features = useBillingFeatures();
  const updateFeature = useUpdateBillingFeature();
  const [selected, setSelected] = useState<number | "new" | null>(null);

  // Premier plan mis en avant (ou le premier tout court) ouvert d'office.
  useEffect(() => {
    if (selected == null && plans.data?.length) {
      setSelected((plans.data.find((p) => p.isFeatured === 1) ?? plans.data[0]).id);
    }
  }, [plans.data, selected]);

  const loading = plans.isLoading || features.isLoading;
  const error = plans.isError || features.isError;
  const current = typeof selected === "number" ? plans.data?.find((p) => p.id === selected) ?? null : null;

  const togglePaid = (code: string, isPaid: boolean) => {
    updateFeature.mutate({ code, payload: { is_paid: isPaid } }, {
      onSuccess: () => addToast({
        title: isPaid ? "Fonctionnalité payante" : "Fonctionnalité gratuite pour tous",
        description: isPaid ? undefined : "Même en phase payante, elle reste ouverte à tous les comptes.",
        variant: "success",
      }),
      onError: (e) => addToast({ title: "Modification refusée", description: serverError(e), variant: "error" }),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <CreditCard className="h-6 w-6 text-indigo-500" />
            Abonnement
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Prix, durée, relance et contenu de chaque plan. Un plan ne se supprime pas, il se retire de l&apos;offre.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            aria-label="Actualiser"
            onClick={() => { plans.refetch(); features.refetch(); }}
            disabled={plans.isFetching || features.isFetching}
          >
            <RefreshCw className={cn("h-4 w-4", (plans.isFetching || features.isFetching) && "animate-spin")} />
          </Button>
          {canPlans && (
            <Button variant="outline" onClick={() => setSelected("new")}>
              <Plus className="mr-2 h-4 w-4" />
              Nouveau plan
            </Button>
          )}
        </div>
      </div>

      <BillingNav />

      {!canPlans && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600" />
          Lecture seule : seul un super-administrateur peut modifier les plans et le catalogue.
        </div>
      )}

      {error && (
        <div className="py-12 text-center">
          <p className="mb-3 text-sm text-red-500">Impossible de charger les plans — la migration 080 est-elle appliquée ?</p>
          <Button variant="outline" size="sm" onClick={() => { plans.refetch(); features.refetch(); }}>Réessayer</Button>
        </div>
      )}

      {!error && loading && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          <Skeleton className="h-96 rounded-xl" />
          <Skeleton className="h-[36rem] rounded-xl" />
        </div>
      )}

      {!error && !loading && plans.data && features.data && (
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          <div className="space-y-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Plans</CardTitle>
              </CardHeader>
              <CardContent className="p-2 pt-0">
                <ul className="space-y-1">
                  {plans.data.map((p) => {
                    const active = p.id === selected;
                    return (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => setSelected(p.id)}
                          aria-current={active ? "true" : undefined}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            active ? "bg-indigo-50 dark:bg-indigo-950/40" : "hover:bg-zinc-50 dark:hover:bg-zinc-800/60",
                          )}
                        >
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2 text-sm font-semibold">
                              {p.nameI18n.fr ?? p.code}
                              {p.isFeatured === 1 && (
                                <Badge className="border-0 bg-indigo-100 px-1.5 py-0 text-[10px] text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                                  mis en avant
                                </Badge>
                              )}
                            </span>
                            <span className="block font-mono text-[11px] text-zinc-500">{p.code}</span>
                          </span>
                          <span className="text-right text-sm">
                            <span className="block font-semibold tabular-nums">
                              {formatFcfa(p.priceAmount)} <span className="text-xs font-normal text-zinc-500">{periodSuffix(p.durationMonths)}</span>
                            </span>
                            <span className="block text-xs text-zinc-500">relance {p.reminderDays} j avant</span>
                          </span>
                          <span
                            className={cn(
                              "ml-1 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                              p.isActive === 1
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800",
                            )}
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                            {p.isActive === 1 ? "Proposé" : "Retiré"}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Catalogue des fonctionnalités</CardTitle>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Une fonctionnalité gratuite reste ouverte à tous, même en phase payante.
                </p>
              </CardHeader>
              <CardContent className="p-0">
                <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {features.data.map((f) => (
                    <li key={f.code} className="flex items-center gap-3 px-6 py-3">
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm">{f.nameI18n.fr ?? f.code}</span>
                        <span className="block font-mono text-[11px] text-zinc-500">{f.code}</span>
                      </span>
                      <label className="flex items-center gap-2 text-xs text-zinc-500">
                        Payante
                        <Switch
                          checked={f.isPaid === 1}
                          disabled={!canPlans || updateFeature.isPending}
                          onCheckedChange={(v) => togglePaid(f.code, v)}
                          aria-label={`${f.nameI18n.fr ?? f.code} payante`}
                        />
                      </label>
                      <span
                        className={cn(
                          "w-20 rounded-full px-2 py-0.5 text-center text-[11px] font-semibold",
                          f.isAvailable === 1
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800",
                        )}
                        title={f.isAvailable === 1 ? "Le code sait la verrouiller" : "Annoncée, pas encore livrée"}
                      >
                        {f.isAvailable === 1 ? "Livrée" : "À venir"}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {selected != null && (
            <PlanEditor
              key={String(selected)}
              plan={current}
              plans={plans.data}
              features={features.data}
              canEdit={canPlans}
              onCreated={(id) => setSelected(id)}
            />
          )}
        </div>
      )}
    </div>
  );
}
