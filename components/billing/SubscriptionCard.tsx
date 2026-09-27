"use client";

/**
 * Carte « Abonnement et coche » de la fiche utilisateur.
 *
 * Dit où en est le compte (actif, à venir, terminé, exempté), si la coche
 * s'affiche et pourquoi — c'est la question qu'on pose au support —, puis les
 * périodes et paiements récents. Offrir des mois et révoquer / restaurer la
 * coche se font d'ici, motif obligatoire.
 */

import { useState } from "react";
import { Gift, ShieldOff, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { AccountBadgeIcon } from "@/components/account-badge";
import { useToast } from "@/components/ui/toast";
import { usePermissions } from "@/hooks/usePermissions";
import {
  useBillingPlans, useRestoreBadge, useRevokeBadge, useUserBilling,
} from "@/hooks/useBilling";
import {
  PAYMENT_STATUS_CLASS, PAYMENT_STATUS_LABEL, PERIOD_SOURCE_LABEL, fmtDay, planLabel,
} from "@/lib/billing-labels";
import { formatFcfa } from "@/lib/plan-pricing";
import { cn } from "@/lib/utils";
import type { BillingPlan, UserBillingResponse } from "@/types";
import { GiftDialog } from "./GiftDialog";

const TONE = {
  neutral: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  upcoming: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
  ended: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
};

const shortDay = (d: string) =>
  new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });

const serverError = (e: unknown) =>
  (e as { response?: { data?: { error?: string } } })?.response?.data?.error
  || (e instanceof Error ? e.message : undefined);

function describe(b: UserBillingResponse, plans?: BillingPlan[]) {
  const e = b.entitlements;
  if (e.exempt) {
    return { label: "Exempté", tone: TONE.neutral, detail: "Équipe ou compte officiel : jamais soumis à l'offre." };
  }
  if (e.period) {
    return {
      label: "Actif",
      tone: TONE.active,
      detail: `${planLabel(e.period.plan, plans)} jusqu'au ${fmtDay(e.period.endsAt)}`
        + (e.period.autoRenew ? " · renouvellement automatique" : ""),
    };
  }
  if (e.upcoming) {
    return {
      label: "À venir",
      tone: TONE.upcoming,
      detail: `${planLabel(e.upcoming.plan, plans)} à partir du ${fmtDay(e.upcoming.startsAt)}`,
    };
  }
  if (e.lapsedAt) {
    return { label: "Terminé", tone: TONE.ended, detail: `Depuis le ${fmtDay(e.lapsedAt)}.` };
  }
  return {
    label: "Aucun abonnement",
    tone: TONE.neutral,
    detail: e.phase === "paid"
      ? "Fonctionnalités Plus fermées pour ce compte."
      : `Tout reste ouvert pendant la phase ${e.phase === "free" ? "gratuite" : "de grâce"}.`,
  };
}

/** La coche suit l'abonnement (comptes personnels), sauf révocation admin. */
function coche(b: UserBillingResponse, verified: boolean) {
  if (b.badgeRevocation) {
    return {
      shown: false,
      why: `Révoquée le ${fmtDay(b.badgeRevocation.revokedAt)}`
        + (b.badgeRevocation.revokedByName ? ` par ${b.badgeRevocation.revokedByName}` : "")
        + ` — ${b.badgeRevocation.reason}`,
    };
  }
  if (verified) {
    return {
      shown: true,
      why: b.entitlements.period || b.entitlements.upcoming
        ? "Abonné Alanya Plus — coche affichée."
        : "Coche posée sur le compte.",
    };
  }
  if (b.entitlements.phase === "free") {
    return { shown: false, why: "Interrupteur éteint : aucune coche tant que le payant n'est pas activé." };
  }
  if (!b.entitlements.period && !b.entitlements.upcoming) {
    return { shown: false, why: "Pas d'abonnement actif : la coche ne s'affiche pas." };
  }
  return { shown: false, why: "Abonnement sans coche (période offerte sans distinction, ou statut en attente)." };
}

export function SubscriptionCard({
  userId,
  userName,
  verified,
}: {
  userId: number;
  userName: string;
  verified: boolean;
}) {
  const { can } = usePermissions();
  const { addToast } = useToast();
  const { data, isLoading, isError, refetch } = useUserBilling(userId);
  const { data: plans } = useBillingPlans();
  const revoke = useRevokeBadge();
  const restore = useRestoreBadge();
  const [giftOpen, setGiftOpen] = useState(false);
  const [badgeAction, setBadgeAction] = useState<"revoke" | "restore" | null>(null);
  const [badgeReason, setBadgeReason] = useState("");
  const [missingReason, setMissingReason] = useState(false);

  const state = data ? describe(data, plans) : null;
  const badge = data ? coche(data, verified) : null;
  const canDecide = can("verifications.decide");
  const pending = revoke.isPending || restore.isPending;

  const closeBadgeDialog = (open: boolean) => {
    if (!open) {
      setBadgeAction(null);
      setBadgeReason("");
      setMissingReason(false);
    }
  };

  const submitBadge = () => {
    const motif = badgeReason.trim();
    if (!motif) {
      setMissingReason(true);
      return;
    }
    const mutation = badgeAction === "revoke" ? revoke : restore;
    mutation.mutate(
      { userId, reason: motif },
      {
        onSuccess: () => {
          addToast({
            title: badgeAction === "revoke" ? "Coche révoquée" : "Coche restaurée",
            variant: "success",
          });
          closeBadgeDialog(false);
        },
        onError: (e) =>
          addToast({
            title: badgeAction === "revoke" ? "Révocation refusée" : "Restauration refusée",
            description: serverError(e),
            variant: "error",
          }),
      },
    );
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-semibold">Abonnement et coche</CardTitle>
        {data?.entitlements.tester && (
          <Badge variant="outline" className="px-1.5 py-0 text-[10px] font-medium" title="BILLING_TEST_USERS">
            Testeur
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-12 w-full" />
          </div>
        )}

        {isError && (
          <div className="text-center">
            <p className="mb-2 text-xs text-red-500">Abonnement indisponible.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>Réessayer</Button>
          </div>
        )}

        {data && state && badge && (
          <>
            <div>
              <Badge className={cn("border-0", state.tone)}>{state.label}</Badge>
              <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">{state.detail}</p>
            </div>

            <div className="flex items-start gap-2.5 rounded-md bg-zinc-50 px-3 py-2.5 dark:bg-zinc-900">
              {badge.shown ? (
                <AccountBadgeIcon accountType={0} verificationStatus={2} size={18} className="mt-px" />
              ) : (
                <span
                  aria-hidden
                  className="mt-px h-[18px] w-[18px] shrink-0 rounded-full border-2 border-dashed border-zinc-300 dark:border-zinc-700"
                />
              )}
              <div className="min-w-0">
                <p className="font-medium">{badge.shown ? "Coche affichée" : "Pas de coche"}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{badge.why}</p>
              </div>
            </div>

            {data.periods.length > 0 && (
              <section>
                <h4 className="mb-1 text-xs font-medium text-zinc-500">Périodes</h4>
                <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {data.periods.slice(0, 5).map((p) => (
                    <li key={p.id} className="py-1.5">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-xs tabular-nums">
                          {shortDay(p.startsAt)} → {shortDay(p.endsAt)}
                        </span>
                        <span className="shrink-0 text-xs text-zinc-500">
                          {PERIOD_SOURCE_LABEL[p.source] ?? "—"}
                          {p.grantsBadge === false ? " · sans coche" : ""}
                        </span>
                      </div>
                      {p.source !== 0 && (p.grantedByName || p.reason) && (
                        <p className="truncate text-xs text-zinc-400" title={p.reason ?? undefined}>
                          {[p.grantedByName && `par ${p.grantedByName}`, p.reason].filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {data.payments.length > 0 && (
              <section>
                <h4 className="mb-1 text-xs font-medium text-zinc-500">Paiements</h4>
                <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {data.payments.slice(0, 5).map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-2 py-1.5">
                      <span className="text-xs tabular-nums">
                        {shortDay(p.createdAt)} · <span className="font-medium">{formatFcfa(p.amount)}</span>
                        {p.product === "phone" && <span className="text-zinc-500"> · Numéro Alanya</span>}
                      </span>
                      <Badge className={cn("border-0 px-1.5 py-0 text-[10px]", PAYMENT_STATUS_CLASS[p.status])}>
                        {PAYMENT_STATUS_LABEL[p.status] ?? p.status}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <div className="flex flex-col gap-2">
              {can("billing.gift") && !data.entitlements.exempt && (
                <Button variant="outline" className="w-full" onClick={() => setGiftOpen(true)}>
                  <Gift className="mr-2 h-4 w-4" />
                  Offrir des mois
                </Button>
              )}
              {canDecide && !data.entitlements.exempt && (
                data.badgeRevocation ? (
                  <Button variant="outline" className="w-full" onClick={() => setBadgeAction("restore")}>
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    Restaurer la coche
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full text-red-600 hover:text-red-700 dark:text-red-400"
                    onClick={() => setBadgeAction("revoke")}
                  >
                    <ShieldOff className="mr-2 h-4 w-4" />
                    Révoquer la coche
                  </Button>
                )
              )}
            </div>
          </>
        )}
      </CardContent>

      {data && (
        <GiftDialog
          open={giftOpen}
          onOpenChange={setGiftOpen}
          userId={userId}
          userName={userName}
          currentEnd={data.subscriber?.currentEnd ?? null}
          graceUntil={data.entitlements.graceUntil}
        />
      )}

      <ConfirmDialog
        open={badgeAction != null}
        onOpenChange={closeBadgeDialog}
        title={badgeAction === "revoke" ? "Révoquer la coche" : "Restaurer la coche"}
        description={
          badgeAction === "revoke"
            ? `${userName} perd la distinction « Abonné Alanya Plus ». Les fonctionnalités payées restent. L'utilisateur est notifié.`
            : `${userName} retrouve la coche si son abonnement la porte encore.`
        }
        confirmLabel={badgeAction === "revoke" ? "Révoquer" : "Restaurer"}
        pending={pending}
        onConfirm={submitBadge}
      >
        <div className="space-y-1.5">
          <label htmlFor="badge-reason" className="text-xs font-medium text-zinc-500">
            Motif <span className="font-normal">(journalisé)</span>
          </label>
          <Textarea
            id="badge-reason"
            rows={3}
            value={badgeReason}
            onChange={(e) => {
              setBadgeReason(e.target.value);
              if (missingReason) setMissingReason(false);
            }}
            placeholder="Ex. : usurpation de nom signalée"
            aria-invalid={missingReason}
          />
          {missingReason && (
            <p className="text-xs text-red-600 dark:text-red-400">
              Indiquez le motif : il accompagne le geste dans le journal.
            </p>
          )}
        </div>
      </ConfirmDialog>
    </Card>
  );
}
