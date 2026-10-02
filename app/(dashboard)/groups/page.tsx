"use client";

import { useGroups, useDeleteGroup } from "@/hooks/useGroups";
import { Card, CardContent } from "@/components/ui/card";
import { GroupGridSkeleton } from "@/components/skeletons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { RefreshCw, Users, MessageSquare, Trash2, ChevronRight, SlidersHorizontal, Search } from "lucide-react";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { FilterBar, FilterDef } from "@/components/dashboard/FilterBar";
import { PERIOD_OPTIONS } from "@/lib/period";

const GROUP_FILTERS: FilterDef[] = [
  { key: "status", label: "Statut", options: [
    { value: "", label: "Tous" },
    { value: "active", label: "Actifs" },
    { value: "inactive", label: "Inactifs" },
  ] },
  { key: "period", label: "Période", options: [...PERIOD_OPTIONS] },
  { key: "sort", label: "Trier par", options: [
    { value: "createdAt", label: "Date de création" },
    { value: "groupName", label: "Nom" },
    { value: "members", label: "Membres" },
    { value: "lastMessageAt", label: "Dernier message" },
  ] },
  { key: "order", label: "Ordre", options: [
    { value: "desc", label: "Décroissant" },
    { value: "asc", label: "Croissant" },
  ] },
];
const GROUP_DEFAULTS = { status: "", period: "", sort: "createdAt", order: "desc" };

export default function GroupsPage() {
  const { data: groups, isLoading, isFetching, isError, refetch } = useGroups();
  const { addToast } = useToast();
  const router = useRouter();
  const deleteGroup = useDeleteGroup();
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [values, setValues] = useState<Record<string, string>>(GROUP_DEFAULTS);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filtered = useMemo(() => {
    if (!groups) return [];
    const q = search.trim().toLowerCase();
    const list = groups.filter((g) => {
      if (q && !g.groupName?.toLowerCase().includes(q)) return false;
      if (values.status === "active" && !g.lastMessageAt) return false;
      if (values.status === "inactive" && g.lastMessageAt) return false;
      return true;
    });
    const dir = values.order === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      switch (values.sort) {
        case "groupName": return dir * (a.groupName || "").localeCompare(b.groupName || "");
        case "members": return dir * ((a.members || 0) - (b.members || 0));
        case "lastMessageAt": return dir * (new Date(a.lastMessageAt || 0).getTime() - new Date(b.lastMessageAt || 0).getTime());
        case "createdAt":
        default: return dir * (new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
      }
    });
  }, [groups, search, values]);

  function handleDelete(id: number) {
    deleteGroup.mutate(id, {
      onSuccess: () => {
        addToast({ title: "Groupe supprimé", description: `Groupe #${id}`, variant: "success" });
        setDeleteId(null);
      },
      onError: () => {
        addToast({ title: "Échec de la suppression", variant: "error" });
        setDeleteId(null);
      },
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Groupes</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Gestion des groupes de discussion ({filtered.length}{groups ? ` / ${groups.length}` : ""} groupes)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowFilters((s) => !s)} className={showFilters ? "bg-indigo-50 dark:bg-indigo-950" : ""}>
            <SlidersHorizontal className="h-4 w-4 mr-1" /> Filtres
          </Button>
          <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <FilterBar
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Rechercher un groupe..."
        showFilters={showFilters}
        filters={GROUP_FILTERS}
        values={values}
        defaults={GROUP_DEFAULTS}
        onChange={(k, v) => setValues((prev) => ({ ...prev, [k]: v }))}
        onReset={() => setValues(GROUP_DEFAULTS)}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
      />

      {(isLoading || isFetching) && <GroupGridSkeleton count={6} />}

      {!isLoading && !isFetching && isError && (
        <div className="text-center py-16">
          <p className="text-red-500 text-sm mb-3">Erreur de chargement</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>Réessayer</Button>
        </div>
      )}

      {!isLoading && !isFetching && groups && groups.length === 0 && (
        <div className="text-center py-16 text-zinc-400 text-sm">
          <Users className="h-12 w-12 mx-auto mb-3 text-zinc-300 dark:text-zinc-600" />
          Aucun groupe
        </div>
      )}

      {!isLoading && !isFetching && groups && groups.length > 0 && filtered.length === 0 && (
        <div className="text-center py-16 text-zinc-400 text-sm">
          <Search className="h-10 w-10 mx-auto mb-2 text-zinc-300 dark:text-zinc-600" />
          Aucun groupe trouvé
        </div>
      )}

      {!isLoading && !isFetching && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((group) => (
            <Card
              key={group.conversID}
              onClick={() => router.push(`/groups/${group.conversID}`)}
              className="border-0 shadow-sm hover:shadow-md transition-shadow group cursor-pointer"
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <Avatar className="h-12 w-12 rounded-xl">
                    <AvatarImage src={group.groupPhoto} />
                    <AvatarFallback className="rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 text-lg">
                      {group.groupName?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold truncate">{group.groupName}</h3>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteId(group.conversID); }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-50 dark:hover:bg-red-950/50 rounded"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </button>
                        <ChevronRight className="h-4 w-4 text-zinc-300 dark:text-zinc-600" />
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-zinc-500">
                      <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{group.members} membres</span>
                      <span className="flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" />{group.lastMessageAt ? "Actif" : "Inactif"}</span>
                    </div>
                    {/*
                      L'aperçu du dernier message n'est plus affiché. Sous
                      chiffrement de bout en bout, `conversation.lastMessage`
                      ne porte plus de texte : le serveur ne peut pas calculer
                      l'aperçu d'un corps qu'il ne sait pas ouvrir. Il ne
                      restait donc ici qu'un « Message chiffré » répété à
                      chaque ligne, et — pour les conversations encore en
                      clair — un extrait de conversation privée dans un écran
                      d'administration qui n'a aucune raison de le montrer.

                      L'activité se lit maintenant sur `lastMessageAt`, qui la
                      dit mieux : une date ne dépend pas de ce que le serveur
                      arrive à lire du contenu.
                    */}
                    {group.lastMessageAt && (
                      <p className="text-xs text-zinc-400 mt-2">
                        Dernière activité le {new Date(group.lastMessageAt).toLocaleDateString("fr")}
                      </p>
                    )}
                    <p className="text-xs text-zinc-400 mt-1">Créé le {group.createdAt ? new Date(group.createdAt).toLocaleDateString("fr") : "—"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer le groupe</DialogTitle>
            <DialogDescription>Tous les messages et participants seront perdus.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose>
            <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)}>Supprimer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
