"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useUserDetail, useUserActivity, useUserLogins } from "@/hooks/useUserDetail";
import { useAudit } from "@/hooks/useAudit";
import { useBanUser, useUnbanUser, useSetUserRole, useSetUserSocle, useDeleteUser, useUpdateUserPhone, useCheckAssignablePhone } from "@/hooks/useUsers";
import { formatDisplay, formatLiveInput, isCompletePhone, normalize, validate } from "@/lib/alanya-phone";
import { AccountBadgeLabel, isOfficialAlanyaAccount } from "@/components/account-badge";
import { SubscriptionCard } from "@/components/billing/SubscriptionCard";
import { PhoneHistoryCard } from "@/components/users/PhoneHistoryCard";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  UserDetailPageSkeleton,
  ActivityStatGridSkeleton,
  LoginHistorySkeleton,
} from "@/components/skeletons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/toast";
import { ArrowLeft, MessageSquare, Phone, Users, Smile, Calendar, Globe, Smartphone, Monitor, Clock, Shield, Mail, Ban as BanIcon, CheckCircle2, Shield as ShieldUp, ShieldOff, Trash2, Loader2, X, ZoomIn } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import {
  ROLE_LABELS as roleLabels,
  ACCOUNT_TYPE_LABELS as accountTypeLabels,
  VERIFICATION_LABELS as verificationLabels,
} from "@/lib/account-labels";

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = parseInt(params.id as string);

  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [confirmBan, setConfirmBan] = useState<{ id: number; reason: string } | null>(null);
  const [confirmRole, setConfirmRole] = useState<{ id: number; role: number } | null>(null);
  const [showPhoneChange, setShowPhoneChange] = useState(false);
  const [newPhone, setNewPhone] = useState("");

  const { can } = usePermissions();
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const banMutation = useBanUser();
  const unbanMutation = useUnbanUser();
  const roleMutation = useSetUserRole();
  const deleteMutation = useDeleteUser();
  const phoneMutation = useUpdateUserPhone();
  const socleMutation = useSetUserSocle();

  // Vérifié pendant la saisie : un numéro qu'un utilisateur est en train
  // d'acheter est refusé, un numéro en quarantaine passe avec un avertissement.
  const newPhoneCanonical = normalize(newPhone);
  const { data: newPhoneCheck, isFetching: newPhoneChecking } = useCheckAssignablePhone(
    newPhoneCanonical,
    showPhoneChange && can("phones.read") && isCompletePhone(newPhoneCanonical),
  );

  // `null` = « non touché » : la valeur affichée reste celle du serveur tant que
  // l'administrateur n'a rien changé, sans effet de bord de synchronisation.
  const [socleType, setSocleType] = useState<number | null>(null);

  function refreshDetail() {
    queryClient.invalidateQueries({ queryKey: ["admin-user-detail"] });
  }

  const { data: user, isLoading: userLoading } = useUserDetail(id);
  const { data: activity, isLoading: activityLoading } = useUserActivity(id);
  const { data: logins, isLoading: loginsLoading } = useUserLogins(id);
  const { data: audit, isLoading: auditLoading } = useAudit({
    targetType: "user",
    targetId: id,
    limit: 20,
  });

  if (userLoading) {
    return <UserDetailPageSkeleton />;
  }

  if (!user) {
    return (
      <div className="text-center py-20">
        <p className="text-zinc-400">Utilisateur introuvable</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/users")}>Retour</Button>
      </div>
    );
  }

  const official = isOfficialAlanyaAccount(user);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/users")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            <AccountBadgeLabel
              name={user.nom}
              accountType={user.accountType ?? 0}
              verificationStatus={user.verificationStatus ?? 0}
              fontSize={24}
              nameClassName="font-bold tracking-tight"
            />
          </h1>
          <p className="text-sm text-zinc-500">@{user.pseudo} · {formatDisplay(user.alanyaPhone)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-1 space-y-6">
          <Card className={cn("border-0 shadow-sm", official && "bg-amber-50/80 dark:bg-amber-950/20 ring-1 ring-amber-200/50 dark:ring-amber-800/40")}>
            <CardContent className="p-6 text-center">
              <button onClick={() => setPhotoPreview(user.avatarUrl)} className="relative group mx-auto mb-4 block">
                <Avatar className={cn("h-24 w-24", official && "ring-2 ring-amber-300/60 dark:ring-amber-700/50")}>
                  <AvatarImage src={user.avatarUrl} />
                  <AvatarFallback className={cn("text-2xl", official ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" : "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300")}>
                    {user.nom?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ZoomIn className="h-6 w-6 text-white" />
                </div>
              </button>
              <h2 className="text-xl font-bold">
                <AccountBadgeLabel
                  name={user.nom}
                  accountType={user.accountType ?? 0}
                  verificationStatus={user.verificationStatus ?? 0}
                  fontSize={20}
                  nameClassName="font-bold"
                  className="justify-center"
                />
              </h2>
              <p className="text-sm text-zinc-500">@{user.pseudo}</p>
              <div className="mt-4 flex justify-center gap-2 flex-wrap">
                <Badge className={user.isOnline ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-0" : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 border-0"}>
                  {user.isOnline ? "En ligne" : "Hors ligne"}
                </Badge>
                {official ? (
                  <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800/60">
                    {accountTypeLabels[user.accountType ?? 0]}
                  </Badge>
                ) : (user.accountType ?? 0) > 0 ? (
                  <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300 border-0">
                    {accountTypeLabels[user.accountType ?? 0]}
                  </Badge>
                ) : null}
                {(user.verificationStatus ?? 0) === 2 && (
                  <Badge className="bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300 border-0">
                    Vérifié
                  </Badge>
                )}
                {user.exclus ? <Badge variant="destructive">Banni</Badge> : null}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Informations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row icon={Mail} label={user.email} />
              <Row icon={Phone} label={formatDisplay(user.alanyaPhone)} />
              <Row icon={Globe} label={user.paysLibelle || "Inconnu"} />
              <Row icon={Shield} label={roleLabels[user.typeCompte] || "Inconnu"} />
              <Row icon={Shield} label={`Compte ${accountTypeLabels[user.accountType ?? 0]}`} />
              {(user.verificationStatus ?? 0) > 0 && (
                <Row icon={CheckCircle2} label={verificationLabels[user.verificationStatus ?? 0]} />
              )}
              <Row icon={Calendar} label={`Inscrit le ${user.createdAt ? new Date(user.createdAt).toLocaleDateString("fr") : "-"}`} />
              <Row icon={Clock} label={`Dernière activité : ${user.lastSeen ? new Date(user.lastSeen).toLocaleString("fr") : "-"}`} />
              {user.exclus ? (
                <div className="flex items-start gap-3 text-red-600 pt-2 border-t">
                  <BanIcon className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    <p>Banni le {user.excludeAt ? new Date(user.excludeAt).toLocaleDateString("fr") : "-"}</p>
                    {user.excludeReason && <p className="text-xs text-zinc-500 mt-1">Raison : {user.excludeReason}</p>}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {user.exclus
                ? can("users.unban") && (
                    <Button
                      variant="outline"
                      className="w-full justify-start text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-900 dark:hover:bg-emerald-950"
                      onClick={() => {
                        unbanMutation.mutate(user.alanyaID, {
                          onSuccess: () => { addToast({ title: "Utilisateur débanni", variant: "success" }); refreshDetail(); },
                        });
                      }}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Débannir
                    </Button>
                  )
                : can("users.ban") && (
                    <Button
                      variant="outline"
                      className="w-full justify-start text-red-600 border-red-200 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950"
                      onClick={() => setConfirmBan({ id: user.alanyaID, reason: "" })}
                    >
                      <BanIcon className="h-4 w-4 mr-2" />
                      Bannir
                    </Button>
                  )}
              {can("users.phone") && (
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    setNewPhone(formatDisplay(user.alanyaPhone));
                    setShowPhoneChange(true);
                  }}
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Changer le numéro
                </Button>
              )}
              {can("users.role") && user.typeCompte < 2 && (
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setConfirmRole({ id: user.alanyaID, role: Math.min(user.typeCompte + 1, 2) })}
                >
                  <ShieldUp className="h-4 w-4 mr-2" />
                  Promouvoir
                </Button>
              )}
              {can("users.role") && user.typeCompte > 0 && (
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setConfirmRole({ id: user.alanyaID, role: Math.max(user.typeCompte - 1, 0) })}
                >
                  <ShieldOff className="h-4 w-4 mr-2" />
                  Rétrograder
                </Button>
              )}
              {can("users.delete") && (
                <>
                  <hr className="border-zinc-200 dark:border-zinc-800" />
                  <Button
                    variant="outline"
                    className="w-full justify-start text-red-600 border-red-200 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950"
                    onClick={() => setConfirmDelete(user.alanyaID)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Supprimer
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {can("users.socle") && (() => {
            const currentType = socleType ?? user.accountType ?? 0;
            const isAdminAccount = (user.typeCompte ?? 0) >= 1;
            const dirty = socleType !== null;

            async function saveSocle() {
              try {
                await socleMutation.mutateAsync({
                  id: user!.alanyaID,
                  payload: { account_type: currentType },
                });
                setSocleType(null);
                refreshDetail();
                addToast({ title: "Socle mis à jour" });
              } catch (err: unknown) {
                const msg =
                  (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
                  "Échec de la mise à jour";
                addToast({ title: "Échec", description: msg, variant: "error" });
              }
            }

            return (
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">Socle de compte</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <label htmlFor="socle-genre" className="text-xs font-medium text-zinc-500">
                      Genre de compte
                    </label>
                    <select
                      id="socle-genre"
                      className="w-full rounded-md border px-3 py-2 text-sm bg-background disabled:opacity-50"
                      value={currentType}
                      disabled={isAdminAccount}
                      onChange={(e) => setSocleType(Number(e.target.value))}
                    >
                      {Object.entries(accountTypeLabels)
                        // « Officiel » n'est proposé que si le compte l'est déjà :
                        // ce genre se crée depuis « Créer un utilisateur », il ne
                        // se promeut pas. Le serveur refuse d'ailleurs en 409.
                        .filter(([v]) => Number(v) !== 2 || currentType === 2)
                        .map(([v, label]) => (
                          <option key={v} value={v}>{label}</option>
                        ))}
                    </select>
                    {currentType === 2 && (
                      <p className="text-xs text-zinc-500">
                        Repasser ce compte en personnel ou business le prive de la
                        diffusion et lui retire le logo Alanya.
                      </p>
                    )}
                  </div>

                  {/* La coche suit l'abonnement (comptes personnels) ; révocation
                      depuis la carte Abonnement ci-contre.
                      Elle ne se saisit pas ici, et pas seulement par choix
                      d'interface : le serveur refuse le champ
                      (FIELD_IMMUTABLE). */}
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-zinc-500">Coche</p>
                    <p className="text-sm">
                      {verificationLabels[user.verificationStatus ?? 0]}
                    </p>
                    <p className="text-xs text-zinc-500">
                      Suit l&apos;abonnement Alanya Plus. Gérer depuis la carte Abonnement.
                    </p>
                  </div>

                  {isAdminAccount && (
                    <p className="text-xs text-zinc-500">
                      Ce compte a des droits d&apos;administration : il ne peut pas recevoir de genre
                      business ou officiel. Rétrogradez-le d&apos;abord.
                    </p>
                  )}
                  {currentType === 2 && (
                    <p className="text-xs text-zinc-500">
                      Le logo Alanya sera appliqué comme photo de profil. Ce compte pourra diffuser
                      des annonces, et personne ne pourra lui répondre.
                    </p>
                  )}

                  <Button
                    className="w-full"
                    disabled={!dirty || socleMutation.isPending}
                    onClick={saveSocle}
                  >
                    {socleMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enregistrer"}
                  </Button>
                </CardContent>
              </Card>
            );
          })()}

          {can("billing.read") && (
            <SubscriptionCard
              userId={id}
              userName={user.nom || user.pseudo}
              verified={(user.verificationStatus ?? 0) === 2}
            />
          )}

          <PhoneHistoryCard userId={id} />
        </div>

        {/* Activity + Logins */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Activité</CardTitle>
            </CardHeader>
            <CardContent>
              {activityLoading ? (
                <ActivityStatGridSkeleton count={5} />
              ) : activity ? (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                  <StatBox icon={MessageSquare} label="Messages" value={activity.messagesSent} color="#3b82f6" />
                  <StatBox icon={Users} label="Conversations" value={activity.conversations} color="#6366f1" />
                  <StatBox icon={Phone} label="Appels émis" value={activity.callsMade} color="#8b5cf6" />
                  <StatBox icon={Phone} label="Appels reçus" value={activity.callsReceived} color="#a855f7" />
                  <StatBox icon={Smile} label="Statuts" value={activity.statusesPublished} color="#f59e0b" />
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Historique des connexions</CardTitle>
            </CardHeader>
            <CardContent>
              {loginsLoading ? (
                <LoginHistorySkeleton count={4} />
              ) : (
                <div className="space-y-3">
                  {logins?.map((login) => (
                    <div key={login.idLogin} className="flex items-center gap-4 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-950 shrink-0">
                        {isMobile(login.os_system, login.device)
                          ? <Smartphone className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                          : <Monitor className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{login.device}</p>
                        <p className="text-xs text-zinc-500">
                          {login.os_system}
                          {login.origine && login.origine !== "login" && (
                            <span className={login.origine === "refus"
                              ? "ml-2 text-red-600 dark:text-red-400 font-medium"
                              : "ml-2 text-zinc-400"}>
                              {ORIGINE_LABELS[login.origine]}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="text-right text-xs text-zinc-500 shrink-0">
                        <p>{new Date(login.dateLogin).toLocaleDateString("fr")}</p>
                        <p>{new Date(login.dateLogin).toLocaleTimeString("fr", { hour: "2-digit", minute: "2-digit" })}</p>
                      </div>
                    </div>
                  ))}
                  {(!logins || logins.length === 0) && (
                    <p className="text-center text-zinc-400 text-sm py-6">Aucune connexion enregistrée</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ce que l'équipe a fait à ce compte. Le lien manquant du jour où
              quelqu'un demande « qui m'a banni, et pourquoi ? ». */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Actions sur ce compte</CardTitle>
            </CardHeader>
            <CardContent>
              {auditLoading ? (
                <LoginHistorySkeleton count={2} />
              ) : audit && audit.length > 0 ? (
                <div className="space-y-3">
                  {audit.map((entry) => (
                    <div key={entry.id} className="flex items-start gap-3 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900">
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-xs text-zinc-600 dark:text-zinc-400">{entry.action}</p>
                        <p className="mt-0.5 text-sm">
                          {entry.adminNom ?? <span className="italic text-zinc-400">compte supprimé</span>}
                          {entry.reason ? <span className="text-zinc-500"> — {entry.reason}</span> : null}
                        </p>
                      </div>
                      <div className="shrink-0 text-right text-xs text-zinc-500">
                        <p>{new Date(entry.createdAt).toLocaleDateString("fr")}</p>
                        <p>{new Date(entry.createdAt).toLocaleTimeString("fr", { hour: "2-digit", minute: "2-digit" })}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-6 text-center text-sm text-zinc-400">
                  Aucune action d&apos;administration sur ce compte
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Confirmation Dialogs */}
      <Dialog open={!!confirmBan} onOpenChange={() => setConfirmBan(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bannir l&apos;utilisateur</DialogTitle>
            <DialogDescription>Le compte sera désactivé et l&apos;utilisateur ne pourra plus se connecter.</DialogDescription>
          </DialogHeader>
          <div className="py-3">
            <label className="text-sm font-medium mb-1 block">Raison (optionnelle)</label>
            <Input value={confirmBan?.reason || ""} onChange={(e) => setConfirmBan(prev => prev ? { ...prev, reason: e.target.value } : null)} placeholder="Spam, comportement inapproprié..." />
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose>
            <Button variant="destructive" onClick={() => {
              if (confirmBan) {
                banMutation.mutate({ id: confirmBan.id, reason: confirmBan.reason }, {
                  onSuccess: () => { addToast({ title: "Utilisateur banni", variant: "success" }); setConfirmBan(null); refreshDetail(); },
                });
              }
            }}>
              {banMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Bannir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmRole} onOpenChange={() => setConfirmRole(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Changer le rôle</DialogTitle>
            <DialogDescription>Passer au rôle : <strong>{confirmRole ? roleLabels[confirmRole.role] : ""}</strong></DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose>
            <Button onClick={() => {
              if (confirmRole) {
                roleMutation.mutate({ id: confirmRole.id, typeCompte: confirmRole.role }, {
                  onSuccess: () => { addToast({ title: "Rôle mis à jour", variant: "success" }); setConfirmRole(null); refreshDetail(); },
                });
              }
            }}>
              {roleMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer l&apos;utilisateur</DialogTitle>
            <DialogDescription>Cette action est irréversible. Toutes les données seront supprimées.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose>
            <Button variant="destructive" onClick={() => {
              if (confirmDelete) {
                deleteMutation.mutate(confirmDelete, {
                  onSuccess: () => { addToast({ title: "Utilisateur supprimé", variant: "success" }); setConfirmDelete(null); refreshDetail(); router.push("/users"); },
                });
              }
            }}>
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPhoneChange} onOpenChange={setShowPhoneChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Changer le numéro Alanya</DialogTitle>
            <DialogDescription>Nouveau numéro (3, 4 ou 8 chiffres). Notification envoyée à l&apos;utilisateur.</DialogDescription>
          </DialogHeader>
          <Input
            value={newPhone}
            onChange={(e) => setNewPhone(formatLiveInput(e.target.value))}
            placeholder="00 00 00 00"
          />
          {newPhoneCheck && !newPhoneChecking && newPhoneCheck.phoneCanonical === newPhoneCanonical && (
            <p
              className={cn(
                "text-xs",
                !newPhoneCheck.assignable
                  ? "text-red-500"
                  : newPhoneCheck.quarantineUntil
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-indigo-600 dark:text-indigo-400",
              )}
            >
              {newPhoneCheck.assignable
                ? newPhoneCheck.hint || "Numéro disponible"
                : newPhoneCheck.reason || "Numéro indisponible"}
            </p>
          )}
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose>
            <Button
              onClick={() => {
                const canonical = normalize(newPhone);
                const err = validate(canonical);
                if (err) {
                  addToast({ title: "Numéro invalide", description: err, variant: "error" });
                  return;
                }
                phoneMutation.mutate(
                  { id: user.alanyaID, alanyaPhone: canonical },
                  {
                    onSuccess: () => {
                      addToast({ title: "Numéro mis à jour", variant: "success" });
                      setShowPhoneChange(false);
                      refreshDetail();
                    },
                    onError: (e: unknown) => {
                      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error || "Erreur";
                      addToast({ title: "Échec", description: msg, variant: "error" });
                    },
                  }
                );
              }}
            >
              {phoneMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Photo Preview Dialog */}
      <Dialog open={!!photoPreview} onOpenChange={() => setPhotoPreview(null)}>
        <DialogContent showCloseButton={false} className="sm:max-w-lg p-0 overflow-hidden bg-transparent shadow-none border-0">
          <button onClick={() => setPhotoPreview(null)} className="absolute top-2 right-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors">
            <X className="h-4 w-4" />
          </button>
          <img src={photoPreview || ""} alt="Photo de profil" className="w-full h-auto max-h-[75vh] object-contain rounded-lg" />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ icon: Icon, label }: { icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 text-zinc-400 shrink-0" />
      <span className="truncate">{label}</span>
    </div>
  );
}

/** Ce qui a produit la ligne de journal. `login` reste muet : c'est le cas
    ordinaire, l'afficher partout noierait les quatre autres. */
const ORIGINE_LABELS: Record<string, string> = {
  inscription: "inscription",
  qr: "par QR",
  recovery: "après réinitialisation",
  refus: "tentative refusée",
};

function StatBox({ icon: Icon, label, value, color }: { icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-zinc-50 dark:bg-zinc-900 text-center">
      <Icon className="h-5 w-5 mb-1" style={{ color }} />
      <p className="text-xl font-bold">{value.toLocaleString()}</p>
      <p className="text-xs text-zinc-500">{label}</p>
    </div>
  );
}

function isMobile(os: string, device: string): boolean {
  const s = `${os} ${device}`.toLowerCase();
  return s.includes("android") || s.includes("ios") || s.includes("iphone") || s.includes("samsung") || s.includes("pixel") || s.includes("mobile");
}
