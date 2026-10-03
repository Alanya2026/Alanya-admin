"use client";

import { useState } from "react";
import { AlertTriangle, Check, Copy, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useGenerateBillingCodes } from "@/hooks/useBilling";
import {
  DEFAULT_VALIDITY_DAYS, MAX_BATCH, batchError, codesToCsv, csvFileName, parseWhole,
} from "@/lib/billing-codes";
import { fmtDay } from "@/lib/billing-labels";
import { formatFcfa } from "@/lib/plan-pricing";
import type { BillingCodesGenerated } from "@/types";

const serverError = (e: unknown) =>
  (e as { response?: { data?: { error?: string } } })?.response?.data?.error
  || (e instanceof Error ? e.message : undefined);

/**
 * Générer un lot de codes d'activation.
 *
 * Deux temps dans la même boîte : le formulaire, puis les codes. Les codes en
 * clair ne sont dans la réponse du serveur que cette fois — il n'en garde que
 * l'empreinte. La boîte ne se ferme donc pas d'un clic à côté : seul le bouton
 * « Fermer » le fait, après qu'on a copié ou téléchargé le lot.
 */
export function CodesGenerateDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { addToast } = useToast();
  const generate = useGenerateBillingCodes();
  const [count, setCount] = useState("10");
  const [label, setLabel] = useState("");
  const [validity, setValidity] = useState(String(DEFAULT_VALIDITY_DAYS));
  const [result, setResult] = useState<BillingCodesGenerated | null>(null);
  const [resultLabel, setResultLabel] = useState<string | undefined>();
  const [copied, setCopied] = useState(false);

  const error = batchError(count, validity);

  const reset = () => {
    setCount("10");
    setLabel("");
    setValidity(String(DEFAULT_VALIDITY_DAYS));
    setResult(null);
    setResultLabel(undefined);
    setCopied(false);
  };

  // Tant que des codes sont à l'écran et n'ont été ni copiés ni exportés, on ne
  // laisse pas un clic à côté les perdre.
  const guard = (next: boolean) => {
    if (next) return onOpenChange(true);
    if (result && !copied) {
      addToast({
        title: "Copiez ou téléchargez les codes d'abord",
        description: "Ils ne seront plus jamais affichés.",
        variant: "error",
      });
      return;
    }
    reset();
    onOpenChange(false);
  };

  const submit = () => {
    if (error) return;
    const trimmed = label.trim();
    generate.mutate(
      {
        count: parseWhole(count) as number,
        validity_days: parseWhole(validity) as number,
        ...(trimmed ? { label: trimmed } : {}),
      },
      {
        onSuccess: (data) => {
          setResult(data);
          setResultLabel(trimmed || undefined);
        },
        onError: (e) =>
          addToast({ title: "Génération refusée", description: serverError(e), variant: "error" }),
      },
    );
  };

  const copyAll = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.codes.map((c) => c.code).join("\n"));
      setCopied(true);
      addToast({ title: `${result.codes.length} code(s) copié(s)`, variant: "success" });
    } catch {
      addToast({ title: "Copie impossible", description: "Utilisez le téléchargement.", variant: "error" });
    }
  };

  const download = () => {
    if (!result) return;
    const blob = new Blob([codesToCsv(result, resultLabel)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = csvFileName(resultLabel);
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setCopied(true);
  };

  return (
    <Dialog open={open} onOpenChange={guard}>
      <DialogContent className="max-w-lg" showCloseButton={!result}>
        {!result ? (
          <>
            <DialogHeader>
              <DialogTitle>Générer des codes d&apos;activation</DialogTitle>
              <DialogDescription>
                Chaque code vaut une année d&apos;abonnement, utilisable une seule fois par n&apos;importe
                quel compte. Le prix et la durée sont ceux du plan vendu aujourd&apos;hui.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="codes-count" className="text-sm font-medium">Nombre de codes</label>
                  <Input
                    id="codes-count"
                    inputMode="numeric"
                    value={count}
                    onChange={(e) => setCount(e.target.value)}
                    className="tabular-nums"
                  />
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">De 1 à {MAX_BATCH}.</p>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="codes-validity" className="text-sm font-medium">Valables</label>
                  <div className="relative">
                    <Input
                      id="codes-validity"
                      inputMode="numeric"
                      value={validity}
                      onChange={(e) => setValidity(e.target.value)}
                      className="pr-14 tabular-nums"
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-zinc-400">
                      jours
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Un code non utilisé passé ce délai expire.
                  </p>
                </div>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="codes-label" className="text-sm font-medium">Libellé du lot (facultatif)</label>
                <Input
                  id="codes-label"
                  value={label}
                  maxLength={120}
                  placeholder="Vendeur de Douala, octobre"
                  onChange={(e) => setLabel(e.target.value)}
                />
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Sert à retrouver le lot dans la liste. Les codes, eux, ne se retrouvent pas.
                </p>
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => guard(false)} disabled={generate.isPending}>Annuler</Button>
              <Button onClick={submit} disabled={Boolean(error) || generate.isPending}>
                {generate.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                Générer
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{result.codes.length} code(s) généré(s)</DialogTitle>
              <DialogDescription>
                {result.plan
                  ? `Une année chacun (${result.plan.durationMonths} mois, ${formatFcfa(result.plan.price)}), valables jusqu'au ${fmtDay(result.expiresAt)}.`
                  : `Valables jusqu'au ${fmtDay(result.expiresAt)}.`}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-3">
              <div className="flex gap-2.5 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <p>
                  <strong>Ces codes ne seront plus jamais affichés.</strong> Le serveur n&apos;en garde
                  que l&apos;empreinte : copiez-les ou téléchargez-les maintenant.
                </p>
              </div>
              <ul
                aria-label="Codes générés"
                className="max-h-64 space-y-1 overflow-y-auto rounded-md bg-zinc-50 p-3 font-mono text-sm tracking-wider dark:bg-zinc-900"
              >
                {result.codes.map((c) => <li key={c.id} className="select-all">{c.code}</li>)}
              </ul>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={download}>
                <Download className="mr-1.5 h-4 w-4" />
                Télécharger (CSV)
              </Button>
              <Button variant="outline" onClick={copyAll}>
                {copied ? <Check className="mr-1.5 h-4 w-4" /> : <Copy className="mr-1.5 h-4 w-4" />}
                Copier
              </Button>
              <Button onClick={() => guard(false)} disabled={!copied}>Fermer</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
