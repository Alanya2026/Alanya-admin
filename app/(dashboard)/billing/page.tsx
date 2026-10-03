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
  useExtendBillingGrace, useSetBillingModel, useUpdateBillingSettings,
} from "@/hooks/useBilling";
import { cn } from "@/lib/utils";
import type { BillingModel, BillingPhase, BillingSettingsResponse } from "@/types";

const MIN_GRACE = 7;
const DAY = 86_400_000;

const fmtDate = (d: Date | string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "—";

const daysUntil = (d: string | null) =>
  d ? Math.max(0, Math.ceil((new Date(d).getTime() - Date.now()) / DAY)) : 0;

const serverError = (e: unknown) =>
  (e as { response?: { data?: { error?: string } } })?.response?.data?.error
  || (e instanceof Error ? e.message : undefined);

/** Le régime en vigueur ; sans réglage (serveur antérieur à la migration 090), Alanya Plus. */
const modelOf = (data: BillingSettingsResponse): BillingModel => data.model ?? data.settings.model ?? 1;

const MODEL_OPTIONS: { value: BillingModel; title: string; lines: string[] }[] = [
  {
    value: 1,
    title: "Alanya Plus",
    lines: [
      "Traduction, sauvegarde, trajets et sonneries par liste réservés aux abonnés.",
      "Paiement mobile money dans l'application, renouvellement automatique possible.",
      "Messages et appels toujours ouverts à tous.",
    ],
  },
  {
    value: 2,
    title: "Essai de 3 mois, puis réception seule",
    lines: [
      "Chaque compte a un essai gratuit, puis ne fait plus que recevoir messages et appels.",
      "Un abonnement d'un an se prend sur le site de paiement ; le code reçu s'entre dans l'application.",
      "Aucun paiement dans l'application, aucun renouvellement automatique.",
    ],
  },
];

const PHASE_LABEL: Record<BillingPhase, string> = { free: "Gratuit", grace: "Grâce", paid: "Payant" };

const PHASE_BADGE: Record<BillingPhase, string> = {
  free: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  grace: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  paid: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
};

// ── Frise des phases ─────────────────────────────────────────────────────

function PhaseStrip({ data }: { data: BillingSettingsResponse }) {
  const { phase, settings } = data;
  const trial = modelOf(data) === 2;
  const graceEnd = phase === "free"
    ? new Date(Date.now() + settings.defaultGraceDays * DAY)
    : settings.graceUntil;
  const segments: { key: BillingPhase; title: string; detail: string }[] = [
    {
      key: "free",
      title: "Gratuit",
      detail: trial ? "tout est ouvert pour tous, aucun décompte d'essai" : "tout pour tous · coche sur vérification seule",
    },
    {
      key: "grace",
      title: "Grâce",
      detail: phase === "free"
        ? `${settings.defaultGraceDays} jours après l'activation · jusqu'au ${fmtDate(graceEnd)}`
        : `jusqu'au ${fmtDate(graceEnd)}`,
    },
    {
      key: "paid",
      title: "Payant",
      detail: trial
        ? `après ses ${settings.trialDays} jours d'essai, un compte sans abonnement ne fait que recevoir`
        : "fonctionnalités et coche réservées aux abonnés",
    },
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
  if (modelOf(data) === 2) {
    if (data.activationBlockedBy === "BILLING_CODE_SECRET_MISSING") {
      return (
        <div className="flex gap-2.5 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p>
            <strong>Secret des codes absent.</strong>{" "}
            L&apos;activation est refusée tant que <code className="font-mono">ACTIVATION_CODE_SECRET</code>{" "}
            (32 caractères au moins) n&apos;est pas posé dans le <code className="font-mono">.env</code> du serveur :
            sans lui, aucun code ne peut être émis ni vérifié.
          </p>
        </div>
      );
    }
    if (!data.settings.payUrl) {
      return (
        <div className="flex gap-2.5 rounded-lg bg-zinc-100 p-3 text-sm text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Aucun site de paiement n&apos;est renseigné : le bouton « Payer » de l&apos;application reste grisé.
            Les codes générés dans l&apos;onglet Codes se saisissent normalement.
          </p>
        </div>
      );
    }
    return null;
  }
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

// ── Régime ───────────────────────────────────────────────────────────────

/**
 * Lequel des deux régimes est en vigueur. Se change payant éteint seulement :
 * passer au régime essai payant allumé fermerait d'un coup l'envoi à tous les
 * comptes dont l'essai serait déjà écoulé. Le régime essai s'installe donc par
 * l'activation, avec sa grâce.
 */
function ModelCard({
  data, canEdit, onChange,
}: {
  data: BillingSettingsResponse;
  canEdit: boolean;
  onChange: (m: BillingModel) => void;
}) {
  const current = modelOf(data);
  const locked = data.phase !== "free";
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Régime</CardTitle>
        <CardDescription>
          {locked
            ? "Le régime ne se change que payant éteint : désactivez d'abord le payant."
            : "Ce que devient l'application quand le payant s'allume."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div role="radiogroup" aria-label="Régime de l'abonnement" className="grid gap-3 md:grid-cols-2">
          {MODEL_OPTIONS.map((o) => {
            const on = o.value === current;
            return (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={on}
                disabled={!canEdit || locked || on}
                onClick={() => onChange(o.value)}
                className={cn(
                  "flex flex-col gap-2 rounded-lg border p-4 text-left transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  on
                    ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40"
                    : "border-zinc-200 hover:border-zinc-300 disabled:opacity-60 disabled:hover:border-zinc-200 dark:border-zinc-800 dark:hover:border-zinc-700",
                )}
              >
                <span className="flex items-center justify-between gap-2 text-sm font-semibold">
                  {o.title}
                  {on && (
                    <span className="font-mono text-[10px] uppercase tracking-wider text-indigo-600 dark:text-indigo-300">
                      En vigueur
                    </span>
                  )}
                </span>
                <ul className="space-y-1 text-xs leading-snug text-zinc-500 dark:text-zinc-400">
                  {o.lines.map((l) => <li key={l}>• {l}</li>)}
                </ul>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
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
    help: "Régime essai : durée gratuite de chaque compte à partir de son inscription (90 = trois mois). Sans effet en régime Alanya Plus.",
  },
  {
    key: "retention_days" as const, from: "retentionDays" as const,
    label: "Conservation après échéance", min: 0, max: 365,
    help: "Délai avant suppression des données des fonctionnalités payantes. La sauvegarde reste toujours restaurable.",
  },
];

type FieldKey = (typeof FIELDS)[number]["key"];

/** https obligatoire, sans identifiants ni fragment : ce que le serveur accepte (parsePayUrl). */
function payUrlError(v: string): string | null {
  const t = v.trim();
  if (!t) return null;
  try {
    const u = new URL(t);
    if (u.protocol !== "https:" || u.username || u.password || u.hash || !u.hostname.includes(".")) throw new Error();
    return t.length > 255 ? "255 caractères au plus." : null;
  } catch {
    return "Adresse https complète attendue, par exemple https://pay.alanya237.com/abonnement";
  }
}

function SettingsCard({ data, canEdit }: { data: BillingSettingsResponse; canEdit: boolean }) {
  const { addToast } = useToast();
  const update = useUpdateBillingSettings();
  const trial = modelOf(data) === 2;
  const [payUrl, setPayUrl] = useState(data.settings.payUrl ?? "");
  useEffect(() => setPayUrl(data.settings.payUrl ?? ""), [data.settings.updatedAt, data.settings.payUrl]);
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
  const payUrlErr = trial ? payUrlError(payUrl) : null;
  const payUrlDirty = trial && payUrl.trim() !== (data.settings.payUrl ?? "");
  const dirty = FIELDS.some((f) => Number(values[f.key]) !== data.settings[f.from]) || payUrlDirty;
  const valid = Object.keys(errors).length === 0 && !payUrlErr;

  const save = () => {
    const patch: Record<string, number | string | null> = {};
    for (const f of FIELDS) {
      if (Number(values[f.key]) !== data.settings[f.from]) patch[f.key] = Number(values[f.key]);
    }
    if (payUrlDirty) patch.pay_url = payUrl.trim() || null;
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
        {trial && (
          <div className="space-y-1.5">
            <label htmlFor="pay-url" className="text-sm font-medium">Site de paiement</label>
            <Input
              id="pay-url"
              type="url"
              inputMode="url"
              value={payUrl}
              disabled={!canEdit}
              placeholder="https://pay.alanya237.com/abonnement"
              aria-invalid={Boolean(payUrlErr)}
              onChange={(e) => setPayUrl(e.target.value)}
              className={cn(payUrlErr && "border-red-400 focus-visible:ring-red-400")}
            />
            <p className={cn("text-xs leading-snug", payUrlErr ? "text-red-500" : "text-zinc-500 dark:text-zinc-400")}>
              {payUrlErr ?? "Là où le bouton « Payer » de l'application envoie l'utilisateur. Vide : le bouton est grisé. Aucune donnée personnelle n'est ajoutée à l'adresse, seulement la langue."}
            </p>
          </div>
        )}
        {canEdit && (
          <div className="flex justify-end gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
            <Button variant="outline" disabled={!dirty || update.isPending} onClick={() => { setValues(initial()); setPayUrl(data.settings.payUrl ?? ""); }}>
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

type Dialog = null | "activate" | "deactivate" | "extend" | "model";

export default function BillingPage() {
  const { can } = usePermissions();
  const canSettings = can("billing.settings");
  const { addToast } = useToast();
  const { data, isLoading, isFetching, isError, refetch } = useBillingSettings();
  const activate = useActivateBilling();
  const deactivate = useDeactivateBilling();
  const extend = useExtendBillingGrace();
  const setModel = useSetBillingModel();
  const [nextModel, setNextModel] = useState<BillingModel>(2);

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
  const trialModel = data ? modelOf(data) === 2 : false;
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
            {trialModel
              ? "L'essai gratuit, puis la réception seule : quand le payant s'allume, et à quelles conditions."
              : "L'offre Alanya Plus : quand elle devient payante, et à quelles conditions."}
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

          <ModelCard
            data={data}
            canEdit={canSettings}
            onChange={(m) => { setNextModel(m); open("model"); }}
          />

          <SettingsCard data={data} canEdit={canSettings} />

          <ConfirmDialog
            open={dialog === "model"}
            onOpenChange={(o) => !o && setDialog(null)}
            title={nextModel === 2 ? "Passer au régime essai ?" : "Revenir à Alanya Plus ?"}
            description={nextModel === 2
              ? "Chaque compte aura un essai gratuit, puis ne fera plus que recevoir messages et appels. Rien ne change tant que vous n'activez pas le payant : c'est l'activation qui ouvre la grâce des comptes existants."
              : "Les fonctionnalités annexes redeviennent le seul objet de l'abonnement, et messages et appels restent ouverts à tous. Le paiement dans l'application revient."}
            confirmLabel="Changer de régime"
            pending={setModel.isPending}
            onConfirm={() => {
              if (!reasonOk) return;
              setModel.mutate({ model: nextModel, reason: reason.trim() }, done("Régime modifié"));
            }}
          >
            <ReasonField value={reason} onChange={setReason} placeholder="Passage au modèle à essai de trois mois" />
          </ConfirmDialog>

          <ConfirmDialog
            open={dialog === "activate"}
            onOpenChange={(o) => !o && setDialog(null)}
            title="Activer le payant ?"
            description={graceDaysOk
              ? (trialModel
                ? `Tous les comptes gardent tout jusqu'au ${fmtDate(new Date(Date.now() + graceDaysN * DAY))}. Ensuite, un compte sans abonnement et sans essai en cours ne pourra plus ni envoyer ni appeler.`
                : `Les fonctionnalités Plus deviendront payantes le ${fmtDate(new Date(Date.now() + graceDaysN * DAY))}. D'ici là, rien ne change pour personne.`)
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
                {trialModel ? (
                  <li>• À la fin : les comptes sans abonnement reçoivent toujours messages et appels, mais n&apos;envoient plus. Les nouveaux comptes ont {data.settings.trialDays} jours d&apos;essai.</li>
                ) : (
                  <li>• À la fin : fonctionnalités fermées aux non-abonnés, données conservées {data.settings.retentionDays} jours.</li>
                )}
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
