"use client";

/**
 * Instruction d'un dossier de vérification.
 *
 * Ce qu'on regarde, dans l'ordre : le nom à vérifier face au nom affiché,
 * puis les pièces — chargées seulement quand on les ouvre, parce que chaque
 * ouverture est journalisée —, puis la décision. Refuser, demander une pièce
 * et révoquer exigent un motif : il part au titulaire et au journal.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Eye, FileText, Loader2, ShieldCheck, ShieldX, Trash2, Upload, UserRound,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { AccountBadgeLabel } from "@/components/account-badge";
import { usePermissions } from "@/hooks/usePermissions";
import { useVerification, useVerificationDecision } from "@/hooks/useVerification";
import { fetchVerificationDocument, type VerificationDecision } from "@/lib/api/verification";
import { ACCOUNT_TYPE_LABELS, VERIFICATION_LABELS } from "@/lib/account-labels";
import { fmtDateTime, fmtDay } from "@/lib/billing-labels";
import {
  REQUEST_STATUS_CLASS, REQUEST_STATUS_LABEL, docTypeLabel, reasonIsValid, sameName,
} from "@/lib/verification-labels";
import { cn } from "@/lib/utils";
import type { VerificationDocument } from "@/types";

const serverError = (e: unknown) =>
  (e as { response?: { data?: { error?: string } } })?.response?.data?.error
  || (e instanceof Error ? e.message : undefined);

// ── Une pièce ────────────────────────────────────────────────────────────

function DocumentPanel({ doc }: { doc: VerificationDocument }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  // L'URL locale du Blob ne survit pas à la page : libérée au démontage.
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  const open = async () => {
    setLoading(true);
    setFailed(false);
    try {
      const blob = await fetchVerificationDocument(doc.id);
      setUrl(URL.createObjectURL(blob));
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };

  const isImage = doc.mime.startsWith("image/");

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
      <div className="flex items-center justify-between gap-2 border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{docTypeLabel(doc.docType)}</p>
          <p className="text-xs text-zinc-500 tabular-nums">
            {fmtDateTime(doc.uploadedAt)} · {(doc.size / 1024).toFixed(0)} Ko
            {doc.views > 0 && ` · ouverte ${doc.views} fois`}
          </p>
        </div>
        {!doc.purged && !url && (
          <Button size="sm" variant="outline" onClick={open} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="mr-1.5 h-4 w-4" />}
            Afficher
          </Button>
        )}
      </div>
      <div className="flex min-h-[12rem] items-center justify-center bg-zinc-50 dark:bg-zinc-900">
        {doc.purged ? (
          <p className="flex items-center gap-2 px-4 text-center text-xs text-zinc-500">
            <Trash2 className="h-4 w-4" /> Détruite après la décision, comme prévu.
          </p>
        ) : url ? (
          isImage ? (
            // eslint-disable-next-line @next/next/no-img-element -- Blob local, next/image ne s'applique pas
            <img src={url} alt={docTypeLabel(doc.docType)} className="max-h-[28rem] w-full object-contain" />
          ) : (
            <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-indigo-600 hover:underline">
              <FileText className="h-4 w-4" /> Ouvrir le PDF
            </a>
          )
        ) : failed ? (
          <p className="px-4 text-center text-xs text-red-500">Pièce illisible ou coffre indisponible.</p>
        ) : (
          <p className="px-6 text-center text-xs text-zinc-500">
            Non chargée. L&apos;ouverture sera journalisée à votre nom.
          </p>
        )}
      </div>
      {doc.purgeAfter && !doc.purged && (
        <p className="border-t border-zinc-200 px-3 py-1.5 text-xs text-zinc-500 dark:border-zinc-800">
          Destruction prévue le {fmtDay(doc.purgeAfter)}
        </p>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────

type Pending = { decision: VerificationDecision; title: string; description: string; destructive?: boolean; needsReason: boolean; confirm: string };

export default function VerificationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = parseInt(params.id as string, 10);
  const { can } = usePermissions();
  const { addToast } = useToast();
  const { data, isLoading, isError } = useVerification(id);
  const decide = useVerificationDecision();
  const [pending, setPending] = useState<Pending | null>(null);
  const [reason, setReason] = useState("");
  const [reasonMissing, setReasonMissing] = useState(false);

  if (!can("verifications.read")) {
    return <p className="py-20 text-center text-sm text-zinc-500">Accès réservé à l&apos;équipe d&apos;administration.</p>;
  }
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    );
  }
  if (isError || !data) {
    return (
      <div className="py-20 text-center">
        <p className="mb-3 text-sm text-red-500">Dossier introuvable.</p>
        <Button variant="outline" size="sm" onClick={() => router.push("/verifications")}>Retour à la file</Button>
      </div>
    );
  }

  const { request: r, user, documents, history } = data;
  const open = r.status === "pending" || r.status === "document_requested";
  const canDecide = can("verifications.decide");
  const displayed = user?.nom ?? r.userName ?? "";
  const nameMatches = sameName(r.claimedName, displayed);

  const ask = (p: Pending) => {
    setReason("");
    setReasonMissing(false);
    setPending(p);
  };

  const confirm = () => {
    if (!pending) return;
    if (pending.needsReason && !reasonIsValid(reason)) {
      setReasonMissing(true);
      return;
    }
    decide.mutate(
      { id, decision: pending.decision, reason: pending.needsReason ? reason.trim() : undefined },
      {
        onSuccess: () => {
          addToast({ title: pending.confirm, variant: "success" });
          setPending(null);
        },
        onError: (e) => addToast({ title: "Décision non enregistrée", description: serverError(e), variant: "error" }),
      },
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/verifications")} aria-label="Retour à la file">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0">
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold tracking-tight">
            Dossier n° {r.id}
            <Badge className={cn("border-0", REQUEST_STATUS_CLASS[r.status])}>
              {r.nameChanged ? "Nom modifié" : REQUEST_STATUS_LABEL[r.status]}
            </Badge>
          </h1>
          <p className="text-sm text-zinc-500">
            Déposé le {fmtDateTime(r.createdAt)}
            {r.decidedAt && ` · décidé le ${fmtDateTime(r.decidedAt)}${r.reviewerName ? ` par ${r.reviewerName}` : ""}`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <Card className="border-0 shadow-sm">
            <CardContent className="space-y-4 p-6">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={user?.avatarUrl ?? undefined} />
                  <AvatarFallback className="bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                    {displayed.charAt(0) || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <AccountBadgeLabel
                    name={displayed}
                    accountType={user?.accountType ?? 0}
                    verificationStatus={user?.verificationStatus ?? 0}
                    fontSize={16}
                    nameClassName="font-semibold"
                  />
                  <p className="truncate text-xs text-zinc-500">@{user?.pseudo ?? r.pseudo} · #{r.alanyaId}</p>
                </div>
              </div>

              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-xs font-medium text-zinc-500">Nom à vérifier (déclaré au dépôt)</dt>
                  <dd className="font-medium">{r.claimedName}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-zinc-500">Nom affiché aujourd&apos;hui</dt>
                  <dd className={cn("font-medium", !nameMatches && "text-amber-600 dark:text-amber-400")}>
                    {displayed}
                    {!nameMatches && <span className="block text-xs font-normal">différent du nom déclaré</span>}
                  </dd>
                </div>
                {r.nameAtApproval && (
                  <div>
                    <dt className="text-xs font-medium text-zinc-500">Nom vérifié</dt>
                    <dd>{r.nameAtApproval}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs font-medium text-zinc-500">Genre de compte</dt>
                  <dd>{ACCOUNT_TYPE_LABELS[user?.accountType ?? 0]}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-zinc-500">Coche aujourd&apos;hui</dt>
                  <dd>
                    {VERIFICATION_LABELS[user?.verificationStatus ?? 0]}
                    {user?.verifiedUntil && ` · jusqu'au ${fmtDay(user.verifiedUntil)}`}
                  </dd>
                </div>
              </dl>

              <Link
                href={`/users/${r.alanyaId}`}
                className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:underline"
              >
                <UserRound className="h-4 w-4" /> Voir la fiche du compte
              </Link>
            </CardContent>
          </Card>

          {(r.reason || r.revokeReason) && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">
                  {r.status === "revoked" ? "Motif de la révocation" : r.status === "refused" ? "Motif du refus" : "Pièce demandée"}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-zinc-600 dark:text-zinc-300">
                {r.status === "revoked" ? r.revokeReason : r.reason}
              </CardContent>
            </Card>
          )}

          {history.length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Dossiers précédents</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {history.map((h) => (
                    <li key={h.id} className="flex items-center justify-between gap-2 py-1.5">
                      <Link href={`/verifications/${h.id}`} className="text-sm hover:text-indigo-600 hover:underline">
                        n° {h.id} · {fmtDay(h.createdAt)}
                      </Link>
                      <Badge className={cn("border-0 px-1.5 py-0 text-[10px]", REQUEST_STATUS_CLASS[h.status])}>
                        {REQUEST_STATUS_LABEL[h.status]}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Pièces ({documents.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <p className="text-sm text-zinc-500">Aucune pièce.</p>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {documents.map((d) => <DocumentPanel key={d.id} doc={d} />)}
                </div>
              )}
            </CardContent>
          </Card>

          {canDecide && (open || r.status === "approved") && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Décision</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {open && (
                  <>
                    <Button
                      onClick={() => ask({
                        decision: "approve",
                        title: "Approuver l'identité",
                        description: `La coche s'affichera à côté de « ${displayed} » tant que l'abonnement le permet. Les pièces seront détruites dans 90 jours.`,
                        needsReason: false,
                        confirm: "Identité approuvée",
                      })}
                    >
                      <ShieldCheck className="mr-1.5 h-4 w-4" /> Approuver
                    </Button>
                    {r.status === "pending" && (
                      <Button
                        variant="outline"
                        onClick={() => ask({
                          decision: "request-document",
                          title: "Demander une pièce",
                          description: "Dites précisément ce qui manque : le titulaire le lira tel quel.",
                          needsReason: true,
                          confirm: "Pièce demandée",
                        })}
                      >
                        <Upload className="mr-1.5 h-4 w-4" /> Demander une pièce
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      className="text-red-600 hover:text-red-700 dark:text-red-400"
                      onClick={() => ask({
                        decision: "refuse",
                        title: "Refuser la demande",
                        description: "Le motif est envoyé au titulaire, qui pourra redéposer.",
                        destructive: true,
                        needsReason: true,
                        confirm: "Demande refusée",
                      })}
                    >
                      <ShieldX className="mr-1.5 h-4 w-4" /> Refuser
                    </Button>
                  </>
                )}
                {r.status === "approved" && r.nameChanged && (
                  <Button
                    onClick={() => ask({
                      decision: "reconfirm",
                      title: "Confirmer le nouveau nom",
                      description: `Vous attestez que « ${displayed} » correspond à la pièce du dossier. La coche revient.`,
                      needsReason: false,
                      confirm: "Nouveau nom confirmé",
                    })}
                  >
                    <ShieldCheck className="mr-1.5 h-4 w-4" /> Confirmer le nouveau nom
                  </Button>
                )}
                {r.status === "approved" && (
                  <Button
                    variant="outline"
                    className="text-red-600 hover:text-red-700 dark:text-red-400"
                    onClick={() => ask({
                      decision: "revoke",
                      title: "Révoquer la coche",
                      description: "La coche tombe immédiatement ; le motif est envoyé au titulaire.",
                      destructive: true,
                      needsReason: true,
                      confirm: "Coche révoquée",
                    })}
                  >
                    <ShieldX className="mr-1.5 h-4 w-4" /> Révoquer
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(o) => { if (!o) setPending(null); }}
        title={pending?.title ?? ""}
        description={pending?.description}
        confirmLabel={pending?.title}
        variant={pending?.destructive ? "destructive" : "default"}
        pending={decide.isPending}
        onConfirm={confirm}
      >
        {pending?.needsReason && (
          <div className="space-y-1.5">
            <label htmlFor="decision-reason" className="text-xs font-medium text-zinc-500">
              Motif <span className="font-normal">(envoyé au titulaire, journalisé)</span>
            </label>
            <Textarea
              id="decision-reason"
              rows={3}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (reasonMissing) setReasonMissing(false);
              }}
              aria-invalid={reasonMissing}
              placeholder="Ex. : le verso de la pièce est illisible"
            />
            {reasonMissing && (
              <p className="text-xs text-red-600 dark:text-red-400">Trois caractères au moins.</p>
            )}
          </div>
        )}
      </ConfirmDialog>
    </div>
  );
}
