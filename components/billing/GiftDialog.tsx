"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { useGiftSubscription } from "@/hooks/useBilling";
import { addMonths, fmtDay, nextPeriodStart } from "@/lib/billing-labels";
import { cn } from "@/lib/utils";

const DURATIONS = [1, 3, 6, 12, 24];

const serverError = (e: unknown) =>
  (e as { response?: { data?: { error?: string } } })?.response?.data?.error
  || (e instanceof Error ? e.message : undefined);

/**
 * Offrir Alanya Plus : une période de plus, jamais un faux paiement.
 *
 * Les dates sont dites avant de confirmer — une période offerte s'ajoute à la
 * suite de l'abonnement en cours et ne consomme pas la grâce, exactement
 * comme le fera le serveur. Le motif est obligatoire : il suit le geste dans
 * le journal d'administration et dans l'historique du compte.
 */
export function GiftDialog({
  open,
  onOpenChange,
  userId,
  userName,
  currentEnd,
  graceUntil,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: number;
  userName: string;
  currentEnd: string | null;
  graceUntil: string | null;
}) {
  const { addToast } = useToast();
  const gift = useGiftSubscription();
  const [months, setMonths] = useState(1);
  const [reason, setReason] = useState("");
  const [grantsBadge, setGrantsBadge] = useState(true);
  const [missingReason, setMissingReason] = useState(false);

  const start = nextPeriodStart(new Date(), currentEnd, graceUntil);
  const end = addMonths(start, months);

  const close = (next: boolean) => {
    if (!next) {
      setMonths(1);
      setReason("");
      setGrantsBadge(true);
      setMissingReason(false);
    }
    onOpenChange(next);
  };

  const submit = () => {
    const motif = reason.trim();
    if (!motif) {
      setMissingReason(true);
      return;
    }
    gift.mutate(
      { userId, months, reason: motif, grantsBadge },
      {
        onSuccess: () => {
          addToast({
            title: "Abonnement offert",
            description: `${months} mois pour ${userName}, jusqu'au ${fmtDay(end)}${grantsBadge ? " · avec la coche" : ""}.`,
            variant: "success",
          });
          close(false);
        },
        onError: (e) =>
          addToast({ title: "Abonnement non offert", description: serverError(e), variant: "error" }),
      },
    );
  };

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={close}
      title="Offrir Alanya Plus"
      description={`${userName} reçoit une période offerte. Aucun paiement n'est créé : la période apparaît comme « offerte » dans son historique.`}
      confirmLabel={`Offrir ${months} mois`}
      pending={gift.isPending}
      onConfirm={submit}
    >
      <div className="space-y-4">
        <fieldset className="space-y-2">
          <legend className="text-xs font-medium text-zinc-500">Durée</legend>
          <div className="flex flex-wrap gap-1.5">
            {DURATIONS.map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={m === months}
                onClick={() => setMonths(m)}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-sm tabular-nums transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  m === months
                    ? "border-indigo-500 bg-indigo-50 font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
                    : "border-zinc-200 text-zinc-600 hover:border-zinc-300 dark:border-zinc-800 dark:text-zinc-300",
                )}
              >
                {m} mois
              </button>
            ))}
          </div>
          <p className="rounded-md bg-zinc-50 px-3 py-2 text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
            Du <span className="font-medium text-zinc-900 dark:text-zinc-100">{fmtDay(start)}</span> au{" "}
            <span className="font-medium text-zinc-900 dark:text-zinc-100">{fmtDay(end)}</span>
            {start.getTime() > Date.now() + 60_000 && " — à la suite de ce qui court déjà"}
          </p>
        </fieldset>

        <label className="flex cursor-pointer items-start gap-2.5 rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
            checked={grantsBadge}
            onChange={(e) => setGrantsBadge(e.target.checked)}
          />
          <span className="min-w-0 text-sm">
            <span className="font-medium text-zinc-900 dark:text-zinc-100">Avec la coche</span>
            <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">
              Affiche « Abonné Alanya Plus » à côté du nom. Décochez pour offrir
              les fonctionnalités sans la distinction visuelle.
            </span>
          </span>
        </label>

        <div className="space-y-1.5">
          <label htmlFor="gift-reason" className="text-xs font-medium text-zinc-500">
            Motif <span className="font-normal">(journalisé)</span>
          </label>
          <Textarea
            id="gift-reason"
            rows={3}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (missingReason) setMissingReason(false);
            }}
            placeholder="Ex. : geste commercial après la panne du 12 octobre"
            aria-invalid={missingReason}
          />
          {missingReason && (
            <p className="text-xs text-red-600 dark:text-red-400">
              Indiquez le motif : il accompagne le geste dans le journal.
            </p>
          )}
        </div>
      </div>
    </ConfirmDialog>
  );
}
