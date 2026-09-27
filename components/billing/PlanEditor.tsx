"use client";

/**
 * Éditeur d'un plan (création ou modification).
 *
 * Le code d'un plan ne se modifie pas après création : il sert de référence
 * aux produits des stores et au journal. Un plan ne se supprime pas, il se
 * retire de l'offre — l'historique de ceux qui l'ont payé reste lisible.
 */

import { useMemo, useState } from "react";
import { Info, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { LangTabs } from "@/components/ui/lang-tabs";
import { useToast } from "@/components/ui/toast";
import { PlanPreview } from "@/components/billing/PlanPreview";
import { useCreateBillingPlan, useUpdateBillingPlan } from "@/hooks/useBilling";
import { type ContentLocale, type Translations } from "@/lib/content-locales";
import { referencePlan } from "@/lib/plan-pricing";
import { cn } from "@/lib/utils";
import type { BillingFeature, BillingPlan, BillingPlanPayload } from "@/types";

const CODE_RE = /^[a-z0-9_]{3,40}$/;

interface Form {
  code: string;
  name: Translations;
  duration: string;
  price: string;
  reminder: string;
  isActive: boolean;
  isFeatured: boolean;
  storeIos: string;
  storeAndroid: string;
  features: string[];
}

const fromPlan = (p: BillingPlan | null, features: BillingFeature[]): Form => ({
  code: p?.code ?? "",
  name: p?.nameI18n ?? {},
  duration: String(p?.durationMonths ?? 1),
  price: String(p?.priceAmount ?? ""),
  reminder: String(p?.reminderDays ?? 7),
  isActive: p ? p.isActive === 1 : true,
  isFeatured: p ? p.isFeatured === 1 : false,
  storeIos: p?.storeProductIos ?? "",
  storeAndroid: p?.storeProductAndroid ?? "",
  // Un nouveau plan inclut par défaut tout ce qui est payant.
  features: p?.features ?? features.filter((f) => f.isPaid === 1).map((f) => f.code),
});

const serverError = (e: unknown) =>
  (e as { response?: { data?: { error?: string } } })?.response?.data?.error
  || (e instanceof Error ? e.message : undefined);

interface PlanEditorProps {
  plan: BillingPlan | null;
  plans: BillingPlan[];
  features: BillingFeature[];
  canEdit: boolean;
  onCreated: (id: number) => void;
}

export function PlanEditor({ plan, plans, features, canEdit, onCreated }: PlanEditorProps) {
  const { addToast } = useToast();
  const create = useCreateBillingPlan();
  const update = useUpdateBillingPlan();
  const [form, setForm] = useState<Form>(() => fromPlan(plan, features));
  const [lang, setLang] = useState<ContentLocale>("fr");
  const isNew = plan == null;
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const duration = Number(form.duration);
  const price = Number(form.price);
  const reminder = Number(form.reminder);

  const errors = useMemo(() => {
    const e: Partial<Record<keyof Form, string>> = {};
    if (isNew && !CODE_RE.test(form.code)) e.code = "3 à 40 caractères : a-z, 0-9 et _";
    if (!form.name.fr?.trim() || !form.name.en?.trim()) e.name = "Français et English obligatoires";
    if (!/^\d+$/.test(form.duration) || duration < 1 || duration > 36) e.duration = "Entre 1 et 36 mois";
    if (!/^\d+$/.test(form.price)) e.price = "Montant entier, sans décimales";
    if (!/^\d+$/.test(form.reminder) || reminder >= duration * 28) e.reminder = "Plus court que la durée du plan";
    return e;
  }, [form, isNew, duration, reminder]);
  const valid = Object.keys(errors).length === 0;

  // L'argument de prix se compare au mensuel actif — sauf pour le mensuel lui-même.
  const reference = referencePlan(plans.filter((p) => p.id !== plan?.id));

  const payload = (): BillingPlanPayload => ({
    code: form.code,
    name_i18n: Object.fromEntries(Object.entries(form.name).filter(([, v]) => v?.trim())) as Translations,
    duration_months: duration,
    price_amount: price,
    reminder_days: reminder,
    is_active: form.isActive,
    is_featured: form.isFeatured,
    store_product_ios: form.storeIos.trim() || null,
    store_product_android: form.storeAndroid.trim() || null,
    features: form.features,
  });

  const save = () => {
    if (!valid) return;
    if (isNew) {
      create.mutate(payload(), {
        onSuccess: (p) => { addToast({ title: "Plan créé", variant: "success" }); if (p?.id) onCreated(p.id); },
        onError: (e) => addToast({ title: "Création refusée", description: serverError(e), variant: "error" }),
      });
    } else {
      // Le code ne voyage pas : il ne se modifie pas après création.
      const rest: Partial<BillingPlanPayload> = { ...payload() };
      delete rest.code;
      update.mutate({ id: plan.id, payload: rest }, {
        onSuccess: () => addToast({ title: "Plan enregistré", variant: "success" }),
        onError: (e) => addToast({ title: "Enregistrement refusé", description: serverError(e), variant: "error" }),
      });
    }
  };

  const toggleOffer = () => {
    if (!plan) return;
    update.mutate({ id: plan.id, payload: { is_active: !(plan.isActive === 1) } }, {
      onSuccess: () => addToast({
        title: plan.isActive === 1 ? "Plan retiré de l'offre" : "Plan remis dans l'offre",
        description: plan.isActive === 1 ? "Les périodes déjà payées ne changent pas." : undefined,
        variant: "success",
      }),
      onError: (e) => addToast({ title: "Action refusée", description: serverError(e), variant: "error" }),
    });
  };

  const pending = create.isPending || update.isPending;
  const disabled = !canEdit || pending;

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-3">
        <CardTitle className="text-base">{isNew ? "Nouveau plan" : form.name.fr || plan.code}</CardTitle>
        {!isNew && plan.isFeatured === 1 && (
          <Badge className="border-0 bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">mis en avant</Badge>
        )}
        {!isNew && plan.isActive !== 1 && <Badge variant="secondary">retiré de l&apos;offre</Badge>}
        <span className="flex-1" />
        {!isNew && <code className="font-mono text-xs text-zinc-500">{plan.code}</code>}
      </CardHeader>
      <CardContent className="space-y-5">
        {isNew && (
          <Field label="Code" error={errors.code} help="Référence stable : ne se modifie plus après création.">
            <Input value={form.code} disabled={disabled} onChange={(e) => set("code", e.target.value.trim())} placeholder="plus_trimestriel" className="font-mono" />
          </Field>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium">Nom</span>
            <LangTabs value={lang} onChange={setLang} translations={form.name} />
          </div>
          <Input
            value={form.name[lang] ?? ""}
            maxLength={60}
            disabled={disabled}
            onChange={(e) => set("name", { ...form.name, [lang]: e.target.value })}
            placeholder={lang === "fr" ? "Annuel" : lang === "en" ? "Yearly" : "年度"}
          />
          {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Durée" error={errors.duration} suffix="mois">
            <Input inputMode="numeric" value={form.duration} disabled={disabled || !isNew} onChange={(e) => set("duration", e.target.value.trim())} className="pr-14 tabular-nums" />
          </Field>
          <Field label="Prix" error={errors.price} suffix="XAF">
            <Input inputMode="numeric" value={form.price} disabled={disabled} onChange={(e) => set("price", e.target.value.trim())} className="pr-14 tabular-nums" />
          </Field>
          <Field label="Relance" error={errors.reminder} suffix="j avant">
            <Input inputMode="numeric" value={form.reminder} disabled={disabled} onChange={(e) => set("reminder", e.target.value.trim())} className="pr-16 tabular-nums" />
          </Field>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Fonctionnalités incluses</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {features.map((f) => {
              const on = form.features.includes(f.code);
              const upcoming = f.isAvailable !== 1;
              return (
                <label
                  key={f.code}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm",
                    upcoming ? "border-zinc-200 bg-zinc-50 text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900" : "border-zinc-200 dark:border-zinc-800",
                  )}
                >
                  <Checkbox
                    checked={on}
                    disabled={disabled}
                    onChange={() => set("features", on ? form.features.filter((c) => c !== f.code) : [...form.features, f.code])}
                  />
                  <span className="flex-1">{f.nameI18n.fr ?? f.code}</span>
                  {upcoming && <span className="font-mono text-[10px] uppercase tracking-wide">à venir</span>}
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <label className="flex items-center gap-2">
            <Checkbox checked={form.isActive} disabled={disabled} onChange={(e) => set("isActive", e.target.checked)} />
            Proposé à l&apos;achat
          </label>
          <label className="flex items-center gap-2">
            <Checkbox checked={form.isFeatured} disabled={disabled} onChange={(e) => set("isFeatured", e.target.checked)} />
            Mis en avant dans l&apos;offre
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Produit App Store" help="À renseigner avec les stores.">
            <Input value={form.storeIos} disabled={disabled} onChange={(e) => set("storeIos", e.target.value)} className="font-mono text-xs" />
          </Field>
          <Field label="Produit Play Store" help="À renseigner avec les stores.">
            <Input value={form.storeAndroid} disabled={disabled} onChange={(e) => set("storeAndroid", e.target.value)} className="font-mono text-xs" />
          </Field>
        </div>

        <PlanPreview
          name={form.name.fr ?? ""}
          plan={{ durationMonths: duration || 1, priceAmount: price || 0 }}
          reference={duration > 1 ? reference : null}
          featured={form.isFeatured}
        />

        {!isNew && (
          <div className="flex gap-2.5 rounded-lg bg-zinc-100 p-3 text-sm text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Un nouveau prix vaut pour les <strong>prochains paiements</strong>. Les périodes déjà payées ne
              changent pas ; les abonnés en renouvellement automatique sont prévenus dans leur relance.
            </p>
          </div>
        )}

        {canEdit && (
          <div className="flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
            {!isNew && (
              <Button variant="outline" disabled={pending} onClick={toggleOffer}>
                {plan.isActive === 1 ? "Retirer de l'offre" : "Remettre dans l'offre"}
              </Button>
            )}
            <span className="flex-1" />
            <Button disabled={!valid || pending} onClick={save}>
              {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isNew ? "Créer le plan" : "Enregistrer"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Field({ label, error, help, suffix, children }: {
  label: string; error?: string; help?: string; suffix?: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      <div className="relative">
        {children}
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-zinc-400">{suffix}</span>
        )}
      </div>
      {(error || help) && (
        <p className={cn("text-xs leading-snug", error ? "text-red-500" : "text-zinc-500 dark:text-zinc-400")}>{error ?? help}</p>
      )}
    </div>
  );
}
