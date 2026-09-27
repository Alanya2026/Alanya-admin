"use client";

/**
 * Abonnement — l'interrupteur du payant et ses réglages.
 *
 * La page dit d'abord où l'on en est (la phase), puis ce que l'activation
 * déclencherait, et seulement ensuite propose d'agir. Il n'existe qu'une
 * action pour passer au payant : « Activer », qui ouvre une grâce d'au moins
 * sept jours. La frise des phases est un repère, pas un sélecteur.
 */

import { useEffect, useState } from "react";
import {
  AlertTriangle, BadgeCheck, CalendarClock, CreditCard, Info, Loader2,
  Power, RefreshCw, ShieldAlert, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { BillingNav } from "@/components/billing/BillingNav";
import { usePermissions } from "@/hooks/usePermissions";
import {
  useActivateBilling, useBillingSettings, useDeactivateBilling,
  useExtendBillingGrace, useUpdateBillingSettings,
} from "@/hooks/useBilling";
import { cn } from "@/lib/utils";
import type { BillingPhase, BillingSettingsResponse } from "@/types";

const MIN_GRACE = 7;
const DAY = 86_400_000;

const fmtDate = (d: Date | string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "—";

const daysUntil = (d: string | null) =>
  d ? Math.max(0, Math.ceil((new Date(d).getTime() - Date.now()) / DAY)) : 0;

const serverError = (e: unknown) =>
  (e as { response?: { data?: { error?: string } } })?.response?.data?.error
  || (e instanceof Error ? e.message : undefined);

const PHASE_LABEL: Record<BillingPhase, string> = { free: "Gratuit", grace: "Grâce", paid: "Payant" };

const PHASE_BADGE: Record<BillingPhase, string> = {
  free: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  grace: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  paid: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
};

// ── Frise des phases ─────────────────────────────────────────────────────

function PhaseStrip({ data }: { data: BillingSettingsResponse }) {
  const { phase, settings } = data;
  const graceEnd = phase === "free"
    ? new Date(Date.now() + settings.defaultGraceDays * DAY)
    : settings.graceUntil;
  const segments: { key: BillingPhase; title: string; detail: string }[] = [
    { key: "free", title: "Gratuit", detail: "tout pour tous · coche sur vérification seule" },
    {
      key: "grace",
      title: "Grâce",
      detail: phase === "free"
        ? `${settings.defaultGraceDays} jours après l'activation · jusqu'au ${fmtDate(graceEnd)}`
        : `jusqu'au ${fmtDate(graceEnd)}`,
    },
    { key: "paid", title: "Payant", detail: "fonctionnalités et coche réservées aux abonnés" },
  ];
  return (
    <ol className="grid grid-cols-1 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800 sm:grid-cols-[1.1fr_1fr_1.3fr]">
      {segments.map((s, i) => {
        const now = s.key === phase;
        return (
          <li
            key={s.key}
            aria-current={now ? "step" : undefined}
            className={cn(
              "relative flex flex-col gap-0.5 px-4 py-3",
              i > 0 && "border-t border-zinc-200 dark:border-zinc-800 sm:border-l sm:border-t-0",
              now && s.key === "free" && "bg-emerald-50 dark:bg-emerald-950/40",
              now && s.key === "grace" && "bg-amber-50 dark:bg-amber-950/40",
              now && s.key === "paid" && "bg-indigo-50 dark:bg-indigo-950/40",
            )}
          >
            <span className="flex items-center justify-between gap-2 text-sm font-semibold">
              {s.title}
              {now && (
                <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Aujourd&apos;hui
                </span>
              )}
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">{s.detail}</span>
          </li>
        );
      })}
    </ol>
  );
}

function Figure({ value, label, icon: Icon }: { value: string; label: string; icon: typeof Users }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <Icon className="mt-1 h-4 w-4 shrink-0 text-zinc-400" />
      <div className="min-w-0">
        <p className="text-2xl font-bold tabular-nums tracking-tight">{value}</p>
        <p className="text-xs leading-snug text-zinc-500 dark:text-zinc-400">{label}</p>
      </div>
    </div>
  );
}

function ProviderBanner({ data }: { data: BillingSettingsResponse }) {
  if (data.activationBlockedBy === "BILLING_PROVIDER_SIMULATED") {
    return (
      <div className="flex gap-2.5 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <p>
          <strong>Fournisseur de paiement : <code className="font-mono">{data.provider}</code>.</strong>{" "}
          En production, l&apos;activation est refusée tant que le paiement est simulé : personne
          ne doit obtenir un abonnement réel avec un paiement fictif.
        </p>
      </div>
    );
  }
  if (data.provider === "simulated") {
    return (
      <div className="flex gap-2.5 rounded-lg bg-zinc-100 p-3 text-sm text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>Paiement simulé : aucun argent n&apos;est encaissé. Environnement d&apos;essai.</p>
      </div>
    );
  }
  return null;
}

// ── Réglages ─────────────────────────────────────────────────────────────

const FIELDS = [
  {
    key: "default_grace_days" as const, from: "defaultGraceDays" as const,
    label: "Durée de la grâce", min: MIN_GRACE, max: 365,
    help: `${MIN_GRACE} jours au minimum. Posée à l'activation ; la date de fin reste modifiable ensuite.`,
  },
  {
    key: "trial_days" as const, from: "trialDays" as const,
    label: "Essai des nouveaux inscrits", min: 0, max: 365,
    help: "Après la grâce, accès complet offert à chaque inscrit. 0 : pas d'essai.",
  },
  {
    key: "retention_days" as const, from: "retentionDays" as const,
    label: "Conservation après échéance", min: 0, max: 365,
    help: "Délai avant suppression des données des fonctionnalités payantes. La sauvegarde reste toujours restaurable.",
  },
];

type FieldKey = (typeof FIELDS)[number]["key"];

function SettingsCard({ data, canEdit }: { data: BillingSettingsResponse; canEdit: boolean }) {
  const { addToast } = useToast();
  const update = useUpdateBillingSettings();
  const initial = (): Record<FieldKey, string> => ({
    default_grace_days: String(data.settings.defaultGraceDays),
    trial_days: String(data.settings.trialDays),
    retention_days: String(data.settings.retentionDays),
  });
  const [values, setValues] = useState(initial);
  useEffect(() => setValues(initial()), [data.settings.updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  const errors: Partial<Record<FieldKey, string>> = {};
  for (const f of FIELDS) {
    const n = Number(values[f.key]);
    if (!/^\d+$/.test(values[f.key]) || n < f.min || n > f.max) {
      errors[f.key] = `Entre ${f.min} et ${f.max} jours`;
    }
  }
  const dirty = FIELDS.some((f) => Number(values[f.key]) !== data.settings[f.from]);
  const valid = Object.keys(errors).length === 0;

  const save = () => {
    const patch: Record<string, number> = {};
    for (const f of FIELDS) {
      if (Number(values[f.key]) !== data.settings[f.from]) patch[f.key] = Number(values[f.key]);
    }
    update.mutate(patch, {
      onSuccess: () => addToast({ title: "Réglages enregistrés", variant: "success" }),
      onError: (e) => addToast({ title: "Échec de l'enregistrement", description: serverError(e), variant: "error" }),
    });
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Réglages</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 md:grid-cols-3">
          {FIELDS.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <label htmlFor={f.key} className="text-sm font-medium">{f.label}</label>
              <div className="relative">
                <Input
                  id={f.key}
                  inputMode="numeric"
                  value={values[f.key]}
                  disabled={!canEdit}
                  aria-invalid={Boolean(errors[f.key])}
                  onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value.trim() }))}
                  className={cn("pr-14 tabular-nums", errors[f.key] && "border-red-400 focus-visible:ring-red-400")}
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-zinc-400">
                  jours
                </span>
              </div>
              <p className={cn("text-xs leading-snug", errors[f.key] ? "text-red-500" : "text-zinc-500 dark:text-zinc-400")}>
                {errors[f.key] ?? f.help}
              </p>
            </div>
          ))}
        </div>
        {canEdit && (
          <div className="flex justify-end gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
            <Button variant="outline" disabled={!dirty || update.isPending} onClick={() => setValues(initial())}>
              Annuler
            </Button>
            <Button disabled={!dirty || !valid || update.isPending} onClick={save}>
              {update.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enregistrer
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────

type Dialog = null | "activate" | "deactivate" | "extend";

export default function BillingPage() {
  const { can } = usePermissions();
  const canSettings = can("billing.settings");
  const { addToast } = useToast();
  const { data, isLoading, isFetching, isError, refetch } = useBillingSettings();
  const activate = useActivateBilling();
  const deactivate = useDeactivateBilling();
  const extend = useExtendBillingGrace();

  const [dialog, setDialog] = useState<Dialog>(null);
  const [reason, setReason] = useState("");
  const [graceDays, setGraceDays] = useState("");
  const [graceUntil, setGraceUntil] = useState("");

  const open = (d: Dialog) => {
    setReason("");
    setGraceDays(String(data?.settings.defaultGraceDays ?? 30));
    setGraceUntil("");
    setDialog(d);
  };

  const reasonOk = reason.trim().length >= 3;
  const graceDaysN = Number(graceDays);
  const graceDaysOk = /^\d+$/.test(graceDays) && graceDaysN >= MIN_GRACE && graceDaysN <= 365;
  const extendOk = Boolean(graceUntil) && data?.settings.graceUntil != null
    && new Date(`${graceUntil}T23:59:59`) > new Date(data.settings.graceUntil);

  const done = (title: string) => ({
    onSuccess: () => { addToast({ title, variant: "success" as const }); setDialog(null); },
    onError: (e: unknown) => addToast({ title: "Action refusée", description: serverError(e), variant: "error" as const }),
  });

  const phase = data?.phase ?? "free";
  const showSkeleton = isLoading || (isFetching && !data);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <CreditCard className="h-6 w-6 text-indigo-500" />
            Abonnement
            {data && <Badge className={cn("ml-1 border-0", PHASE_BADGE[phase])}>{PHASE_LABEL[phase]}</Badge>}
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            L&apos;offre Alanya Plus : quand elle devient payante, et à quelles conditions.
          </p>
        </div>
        <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isFetching} className="shrink-0" aria-label="Actualiser">
          <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
        </Button>
      </div>

      <BillingNav />

      {!canSettings && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600" />
          Lecture seule : seul un super-administrateur peut activer le payant ou modifier ses réglages.
        </div>
      )}

      {isError && (
        <div className="py-12 text-center">
          <p className="mb-3 text-sm text-red-500">
            Impossible de charger l&apos;abonnement — la migration 080 est-elle appliquée ?
          </p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>Réessayer</Button>
        </div>
      )}

      {!isError && showSkeleton && (
        <div className="space-y-4">
          <Skeleton className="h-56 w-full rounded-xl" />
          <Skeleton className="h-44 w-full rounded-xl" />
        </div>
      )}

      {!isError && !showSkeleton && data && (
        <>
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Phase</CardTitle>
              <CardDescription>
                {phase === "free" && "Le payant n'est pas activé : tout est gratuit pour tous."}
                {phase === "grace" && `Le payant est activé. Grâce en cours : encore ${daysUntil(data.settings.graceUntil)} jour(s).`}
                {phase === "paid" && `Payant depuis le ${fmtDate(data.settings.graceUntil)}.`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <PhaseStrip data={data} />

              {phase === "free" && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Si vous activez aujourd&apos;hui</p>
                  <div className="grid gap-3 md:grid-cols-3">
                    <Figure icon={Users} value={data.preview.accounts.toLocaleString("fr-FR")} label="comptes reçoivent l'annonce du compte officiel" />
                    <Figure icon={BadgeCheck} value={data.preview.verifiedBadges.toLocaleString("fr-FR")} label="coche(s) entrent en période de grâce" />
                    <Figure
                      icon={CalendarClock}
                      value={new Date(Date.now() + data.settings.defaultGraceDays * DAY).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                      label="fin de la grâce · rappel aux non-abonnés 7 jours avant"
                    />
                  </div>
                </div>
              )}

              {phase === "grace" && (
                <div className="grid gap-3 md:grid-cols-3">
                  <Figure icon={CalendarClock} value={fmtDate(data.settings.graceUntil)} label="fin de la grâce — les non-abonnés perdent alors l'accès" />
                  <Figure icon={Users} value={data.preview.accounts.toLocaleString("fr-FR")} label="comptes concernés" />
                  <Figure icon={BadgeCheck} value={data.preview.verifiedBadges.toLocaleString("fr-FR")} label="coche(s) en grâce" />
                </div>
              )}

              <ProviderBanner data={data} />

              {canSettings && (
                <div className="flex flex-wrap justify-end gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                  {phase === "grace" && (
                    <Button variant="outline" onClick={() => open("extend")}>Prolonger la grâce…</Button>
                  )}
                  {phase !== "free" && (
                    <Button variant="outline" className="text-red-600 hover:text-red-700" onClick={() => open("deactivate")}>
                      <Power className="mr-2 h-4 w-4" />
                      Désactiver…
                    </Button>
                  )}
                  {phase === "free" && (
                    <Button disabled={Boolean(data.activationBlockedBy)} onClick={() => open("activate")}>
                      Activer le payant…
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <SettingsCard data={data} canEdit={canSettings} />

          <ConfirmDialog
            open={dialog === "activate"}
            onOpenChange={(o) => !o && setDialog(null)}
            title="Activer le payant ?"
            description={graceDaysOk
              ? `Les fonctionnalités Plus deviendront payantes le ${fmtDate(new Date(Date.now() + graceDaysN * DAY))}. D'ici là, rien ne change pour personne.`
              : "Choisissez la durée de la grâce."}
            confirmLabel="Activer"
            pending={activate.isPending}
            onConfirm={() => {
              if (!graceDaysOk || !reasonOk) return;
              activate.mutate({ graceDays: graceDaysN, reason: reason.trim() }, done("Payant activé — la grâce commence"));
            }}
          >
            <div className="space-y-4">
              <ul className="space-y-1.5 text-sm text-zinc-600 dark:text-zinc-300">
                <li>• Annonce du compte officiel à {data.preview.accounts.toLocaleString("fr-FR")} comptes.</li>
                <li>• Rappel sept jours avant la fin de la grâce, aux comptes sans abonnement.</li>
                <li>• À la fin : fonctionnalités fermées aux non-abonnés, données conservées {data.settings.retentionDays} jours.</li>
              </ul>
              <div className="space-y-1.5">
                <label htmlFor="grace-days" className="text-sm font-medium">Durée de la grâce (jours)</label>
                <Input id="grace-days" inputMode="numeric" value={graceDays} onChange={(e) => setGraceDays(e.target.value.trim())} className="tabular-nums" />
                {!graceDaysOk && <p className="text-xs text-red-500">Entre {MIN_GRACE} et 365 jours.</p>}
              </div>
              <ReasonField value={reason} onChange={setReason} placeholder="Lancement de l'offre Alanya Plus" />
            </div>
          </ConfirmDialog>

          <ConfirmDialog
            open={dialog === "deactivate"}
            onOpenChange={(o) => !o && setDialog(null)}
            title="Désactiver le payant ?"
            description="Tout redevient gratuit pour tous, immédiatement. À la réactivation, les abonnés seront compensés de la durée de la phase gratuite."
            confirmLabel="Désactiver"
            variant="destructive"
            pending={deactivate.isPending}
            onConfirm={() => {
              if (!reasonOk) return;
              deactivate.mutate(reason.trim(), done("Payant désactivé — tout est gratuit"));
            }}
          >
            <ReasonField value={reason} onChange={setReason} />
          </ConfirmDialog>

          <ConfirmDialog
            open={dialog === "extend"}
            onOpenChange={(o) => !o && setDialog(null)}
            title="Prolonger la grâce"
            description={`Fin actuelle : ${fmtDate(data.settings.graceUntil)}. Une grâce se prolonge, elle ne se raccourcit pas.`}
            confirmLabel="Prolonger"
            pending={extend.isPending}
            onConfirm={() => {
              if (!extendOk || !reasonOk) return;
              extend.mutate(
                { graceUntil: new Date(`${graceUntil}T23:59:59`).toISOString(), reason: reason.trim() },
                done("Grâce prolongée"),
              );
            }}
          >
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="grace-until" className="text-sm font-medium">Nouvelle fin de grâce</label>
                <Input id="grace-until" type="date" value={graceUntil} onChange={(e) => setGraceUntil(e.target.value)} />
                {graceUntil && !extendOk && <p className="text-xs text-red-500">Choisissez une date après la fin actuelle.</p>}
              </div>
              <ReasonField value={reason} onChange={setReason} />
            </div>
          </ConfirmDialog>
        </>
      )}
    </div>
  );
}

function ReasonField({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor="billing-reason" className="text-sm font-medium">Motif</label>
      <Textarea
        id="billing-reason"
        rows={2}
        maxLength={500}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Obligatoire. Enregistré dans l&apos;activité admin avec votre nom.
      </p>
    </div>
  );
}
