"use client";

/**
 * Réglages de lancement des stickers.
 *
 * Trois interrupteurs (lecture, création, animé), l'ouverture par cohorte et la
 * version minimale. Réservé au super-admin (`stickers.settings`) : les autres
 * administrateurs voient l'état en lecture seule.
 */

import { useEffect, useMemo, useState } from "react";
import { Info, Loader2, Lock, Save, SlidersHorizontal, Undo2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { StickersPageHeader } from "@/components/stickers/StickersPageHeader";
import { usePermissions } from "@/hooks/usePermissions";
import { useSaveStickerSettings, useStickerSettings } from "@/hooks/useStickers";
import { cn } from "@/lib/utils";
import type { StickerSettings, StickerSettingsPatch } from "@/types";

const PRESETS = [0, 1, 10, 50, 100];

interface FormState {
  enabled: boolean;
  creationEnabled: boolean;
  animatedEnabled: boolean;
  cohortPercent: string;
  minAppVersion: string;
}

function fromServer(s: StickerSettings): FormState {
  return {
    enabled: s.enabled === 1,
    creationEnabled: s.creationEnabled === 1,
    animatedEnabled: s.animatedEnabled === 1,
    cohortPercent: String(s.cohortPercent ?? 0),
    minAppVersion: s.minAppVersion ?? "",
  };
}

const erreurServeur = (e: unknown): string | undefined =>
  (e as { response?: { data?: { error?: string } } })?.response?.data?.error ||
  (e instanceof Error ? e.message : undefined);

export default function StickerSettingsPage() {
  const { can } = usePermissions();
  const canEdit = can("stickers.settings");
  const { addToast } = useToast();
  const { data, isLoading, isError, refetch } = useStickerSettings();
  const save = useSaveStickerSettings();
  const [form, setForm] = useState<FormState | null>(null);

  useEffect(() => {
    if (data) setForm(fromServer(data));
  }, [data]);

  const serveur = useMemo(() => (data ? fromServer(data) : null), [data]);
  const dirty = Boolean(form && serveur && JSON.stringify(form) !== JSON.stringify(serveur));

  const pourcentage = Number(form?.cohortPercent);
  const pourcentageValide = Number.isInteger(pourcentage) && pourcentage >= 0 && pourcentage <= 100;

  function patch(p: Partial<FormState>) {
    setForm((f) => (f ? { ...f, ...p } : f));
  }

  function enregistrer() {
    if (!form || !serveur || !pourcentageValide) return;
    const payload: StickerSettingsPatch = {};
    if (form.enabled !== serveur.enabled) payload.enabled = form.enabled;
    if (form.creationEnabled !== serveur.creationEnabled) payload.creation_enabled = form.creationEnabled;
    if (form.animatedEnabled !== serveur.animatedEnabled) payload.animated_enabled = form.animatedEnabled;
    if (form.cohortPercent !== serveur.cohortPercent) payload.cohort_percent = pourcentage;
    if (form.minAppVersion.trim() !== serveur.minAppVersion.trim()) {
      payload.min_app_version = form.minAppVersion.trim() || null;
    }
    save.mutate(payload, {
      onSuccess: () => addToast({ title: "Réglages enregistrés", variant: "success" }),
      onError: (e) => addToast({ title: "Échec de l'enregistrement", description: erreurServeur(e), variant: "error" }),
    });
  }

  if (!can("stickers.read")) {
    return (
      <p className="py-20 text-center text-sm text-zinc-500">
        Accès réservé à l&apos;équipe d&apos;administration.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <StickersPageHeader
        subtitle="Ce qui est ouvert, pour qui, et à partir de quelle version de l'application."
        refreshing={save.isPending}
      />

      {!canEdit && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          <Lock className="h-4 w-4 shrink-0 text-amber-600" />
          Lecture seule : le réglage demande la permission <code className="font-mono">stickers.settings</code>, réservée au super-admin.
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      ) : isError || !data || !form ? (
        <div className="py-12 text-center">
          <p className="mb-3 text-sm text-red-500">Impossible de charger les réglages des stickers.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>Réessayer</Button>
        </div>
      ) : (
        <>
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Interrupteurs de livraison</CardTitle>
              <CardDescription>
                Un interrupteur fermé fait disparaître la fonctionnalité, sans erreur visible et sans
                toucher aux stickers déjà envoyés.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ToggleRow
                title="Catalogue et envoi"
                hint="Ouvrir l'affichage des packs et l'envoi de stickers (type 10). C'est l'interrupteur du lancement V1a."
                checked={form.enabled}
                disabled={!canEdit}
                onChange={(v) => patch({ enabled: v })}
              />
              <ToggleRow
                title="Création de stickers"
                hint="Autoriser l'éditeur et les packs personnels (livraison V1b)."
                checked={form.creationEnabled}
                disabled={!canEdit}
                onChange={(v) => patch({ creationEnabled: v })}
              />
              <ToggleRow
                title="Stickers animés"
                hint="Autoriser la lecture des WebP animés (livraison V1c)."
                checked={form.animatedEnabled}
                disabled={!canEdit}
                onChange={(v) => patch({ animatedEnabled: v })}
              />
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <SlidersHorizontal className="h-4 w-4 text-zinc-400" />
                Ouverture progressive
              </CardTitle>
              <CardDescription>
                Un pourcentage à 0 sans liste d&apos;équipe ferme l&apos;accès à tout le monde, même
                l&apos;interrupteur ouvert.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="cohort-percent">Cohorte servie (%)</Label>
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    id="cohort-percent"
                    inputMode="numeric"
                    value={form.cohortPercent}
                    disabled={!canEdit}
                    aria-invalid={!pourcentageValide}
                    className={cn("w-24 tabular-nums", !pourcentageValide && "border-red-400 focus-visible:ring-red-400")}
                    onChange={(e) => patch({ cohortPercent: e.target.value.trim() })}
                  />
                  <div role="group" aria-label="Palier de cohorte" className="flex flex-wrap gap-1.5">
                    {PRESETS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        disabled={!canEdit}
                        aria-pressed={Number(form.cohortPercent) === p}
                        onClick={() => patch({ cohortPercent: String(p) })}
                        className={cn(
                          "rounded-full border px-3 py-1 text-sm transition-colors disabled:opacity-50",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          Number(form.cohortPercent) === p
                            ? "border-indigo-500 bg-indigo-50 font-medium text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
                            : "border-zinc-200 text-zinc-600 hover:border-zinc-300 dark:border-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-700",
                        )}
                      >
                        {p} %
                      </button>
                    ))}
                  </div>
                </div>
                {!pourcentageValide && <p className="text-xs text-red-500">Entier entre 0 et 100 attendu.</p>}
              </div>

              {data.cohortIds && data.cohortIds.length > 0 && (
                <p className="flex items-start gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {data.cohortIds.length} compte(s) d&apos;équipe ouverts nommément, en plus du pourcentage.
                </p>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="min-version">Version minimale de l&apos;application</Label>
                <Input
                  id="min-version"
                  value={form.minAppVersion}
                  maxLength={20}
                  disabled={!canEdit}
                  placeholder="ex. 3.4.0"
                  className="w-48 font-mono"
                  onChange={(e) => patch({ minAppVersion: e.target.value })}
                />
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Mesure seule pour l&apos;instant : la version est comparée, mais rien n&apos;est encore bloqué côté application.
                </p>
              </div>

              {canEdit && (
                <div className="flex flex-wrap items-center gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                  <Button onClick={enregistrer} disabled={!dirty || !pourcentageValide || save.isPending} variant="outline">
                    {save.isPending ? (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-1 h-4 w-4" />
                    )}
                    Enregistrer
                  </Button>
                  {dirty && (
                    <Button variant="ghost" onClick={() => setForm(serveur)} disabled={save.isPending}>
                      <Undo2 className="mr-1 h-4 w-4" />
                      Annuler
                    </Button>
                  )}
                  <span className="ml-auto text-xs text-zinc-400">
                    {data.updatedAt
                      ? `Dernière modification : ${new Date(data.updatedAt).toLocaleString("fr-FR")}`
                      : "Jamais modifié"}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function ToggleRow({
  title,
  hint,
  checked,
  disabled,
  onChange,
}: {
  title: string;
  hint: string;
  checked: boolean;
  disabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
      <div className="min-w-0">
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{title}</p>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{hint}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className={cn("text-xs font-medium", checked ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-400")}>
          {checked ? "Ouvert" : "Fermé"}
        </span>
        <Switch checked={checked} disabled={disabled} onCheckedChange={onChange} aria-label={title} />
      </div>
    </div>
  );
}
