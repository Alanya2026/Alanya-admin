"use client";

import { useRouter } from "next/navigation";
import { Flag, MessageSquare, UserX, CheckCircle2 } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FeedListSkeleton } from "@/components/skeletons";
import { useOpenReports } from "@/hooks/useReports";
import { usePermissions } from "@/hooks/usePermissions";
import { reportReasonLabel } from "@/lib/report-labels";
import type { Report } from "@/types";

function age(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const h = Math.floor(ms / 3_600_000);
  if (h < 1) return "il y a moins d'une heure";
  if (h < 24) return `il y a ${h} h`;
  return `il y a ${Math.floor(h / 24)} j`;
}

/**
 * File ouverte, posée sur le dashboard.
 *
 * Un signalement invisible est un signalement traité demain : la file vit sur
 * son propre écran, mais son existence se voit d'ici, sans clic. Quatre
 * lignes, les plus récentes ; la décision reste sur /reports où elle dispose
 * du message en clair et de l'historique.
 */
export function ReportsOverview() {
  const router = useRouter();
  const { can } = usePermissions();
  const { data, isLoading } = useOpenReports();

  // Même règle que la navigation : sans `reports.read`, ni lien ni existence.
  if (!can("reports.read")) return null;

  const open = data?.open ?? data?.total ?? 0;
  const rows = (data?.items ?? []).slice(0, 4);

  function goReports() {
    router.push("/reports");
  }

  return (
    <Card
      className={`border-0 shadow-sm overflow-hidden ${
        open > 0 ? "bg-red-50/60 dark:bg-red-950/20" : "bg-white dark:bg-zinc-900"
      }`}
    >
      <CardContent className="py-4">
        {isLoading && <FeedListSkeleton count={2} />}

        {!isLoading && open === 0 && (
          <button
            type="button"
            onClick={goReports}
            className="flex w-full items-center gap-2 text-left text-sm text-zinc-600 hover:text-indigo-600 transition-colors dark:text-zinc-400"
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            Aucun signalement en attente
          </button>
        )}

        {!isLoading && open > 0 && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-2 text-sm font-semibold text-red-700 dark:text-red-400">
                <Flag className="h-4 w-4 shrink-0" />
                <strong>{open}</strong> signalement{open > 1 ? "s" : ""} à traiter
              </p>
              <Button size="sm" onClick={goReports}>
                Traiter
              </Button>
            </div>

            <div className="mt-3 divide-y divide-red-100 dark:divide-red-900/40">
              {rows.map((r) => (
                <ReportRow key={r.id} report={r} />
              ))}
            </div>

            {open > rows.length && (
              <button
                type="button"
                onClick={goReports}
                className="mt-2 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
              >
                Voir toute la file ({open})
              </button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ReportRow({ report }: { report: Report }) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.push("/reports")}
      className="flex w-full items-center gap-3 py-2.5 text-left transition-colors hover:bg-white/60 rounded-lg px-2 -mx-2 dark:hover:bg-zinc-900/60"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400">
        {report.targetType === "message" ? (
          <MessageSquare className="h-3.5 w-3.5" />
        ) : (
          <UserX className="h-3.5 w-3.5" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-200">
          {reportReasonLabel(report.reason)}
        </p>
        <p className="truncate text-xs text-zinc-500 dark:text-zinc-500">
          Signalé par {report.reporterNom ?? "un compte supprimé"} · {age(report.createdAt)}
        </p>
      </div>
    </button>
  );
}
