"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useGroupDetail, useDeleteGroup } from "@/hooks/useGroups";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GroupDetailPageSkeleton } from "@/components/skeletons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/toast";
import { ArrowLeft, Users, MessageSquare, Calendar, Trash2, Shield, Phone } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";

const roleLabels: Record<number, string> = { 0: "Utilisateur", 1: "Admin", 2: "Super Admin" };

export default function GroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = parseInt(params.id as string);
  const { addToast } = useToast();
  const deleteGroup = useDeleteGroup();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: group, isLoading } = useGroupDetail(id);

  function handleDelete() {
    deleteGroup.mutate(id, {
      onSuccess: () => {
        addToast({ title: "Groupe supprimé", variant: "success" });
        router.push("/groups");
      },
      onError: () => {
        addToast({ title: "Échec de la suppression", variant: "error" });
        setConfirmDelete(false);
      },
    });
  }

  if (isLoading) {
    return <GroupDetailPageSkeleton />;
  }

  if (!group) {
    return (
      <div className="text-center py-20">
        <p className="text-zinc-400">Groupe introuvable</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/groups")}>Retour</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/groups")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight truncate">{group.groupName}</h1>
          <p className="text-sm text-zinc-500">Groupe #{group.conversID} · {group.memberCount} membres</p>
        </div>
        <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(true)}>
          <Trash2 className="h-4 w-4 mr-1" /> Supprimer
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Infos groupe */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6 text-center">
              <Avatar className="h-24 w-24 rounded-2xl mx-auto mb-4">
                <AvatarImage src={group.groupPhoto || undefined} />
                <AvatarFallback className="rounded-2xl text-3xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  {group.groupName?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-xl font-bold truncate">{group.groupName}</h2>
              <p className="text-sm text-zinc-500 mt-1">
                {group.lastMessageAt ? "Groupe actif" : "Groupe inactif"}
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Informations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row icon={Users} label={`${group.memberCount} membres`} />
              <Row icon={MessageSquare} label={`${group.messageCount.toLocaleString()} messages`} />
              <Row icon={Calendar} label={`Créé le ${group.createdAt ? new Date(group.createdAt).toLocaleDateString("fr") : "—"}`} />
              {/*
                Le texte du dernier message n'est plus montré : sous
                chiffrement de bout en bout, le serveur ne peut pas l'ouvrir,
                et sur une conversation en clair c'est un extrait privé dans
                un écran d'administration. Seule la date reste — c'est elle
                qui répond à la question posée ici, « ce groupe vit-il ? ».

                Le contenu d'un message ne remonte que par un signalement,
                joint par la personne qui signale et dans ce seul écran.
              */}
              {group.lastMessageAt && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-zinc-400 mb-1">Dernière activité</p>
                  <p className="text-sm">{new Date(group.lastMessageAt).toLocaleString("fr")}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Membres */}
        <div className="lg:col-span-2">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Membres ({group.members.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {group.members.map((m) => (
                  <button
                    key={m.alanyaID}
                    onClick={() => router.push(`/users/${m.alanyaID}`)}
                    className="flex items-center gap-3 w-full p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left"
                  >
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage src={m.avatarUrl || undefined} />
                      <AvatarFallback className="bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                        {m.nom?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{m.nom}</p>
                        {m.typeCompte >= 1 && (
                          <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border-0 text-[10px] px-1.5 py-0">
                            <Shield className="h-2.5 w-2.5 mr-0.5" />{roleLabels[m.typeCompte]}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 truncate flex items-center gap-1">
                        <Phone className="h-3 w-3" />{m.alanyaPhone || "—"}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <Badge className={m.isOnline ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-0" : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 border-0"}>
                        {m.isOnline ? "En ligne" : "Hors ligne"}
                      </Badge>
                      {m.joinedAt && (
                        <p className="text-[10px] text-zinc-400 mt-1">Ajouté le {new Date(m.joinedAt).toLocaleDateString("fr")}</p>
                      )}
                    </div>
                  </button>
                ))}
                {group.members.length === 0 && (
                  <p className="text-center text-zinc-400 text-sm py-6">Aucun membre</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Confirm suppression */}
      <Dialog open={confirmDelete} onOpenChange={() => setConfirmDelete(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer le groupe</DialogTitle>
            <DialogDescription>
              « {group.groupName} » et tous ses messages et participants seront définitivement perdus.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteGroup.isPending}>
              {deleteGroup.isPending ? "Suppression…" : "Supprimer"}
            </Button>
          </DialogFooter>
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
