"use client";

import { useEffect, useId, useMemo, useState, type KeyboardEvent } from "react";
import { useUsers } from "@/hooks/useUsers";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Loader2, Search, X } from "lucide-react";
import type { User } from "@/types";

/** Plafond serveur de la liste explicite — e2eeSettingsService.js. */
export const COHORT_IDS_MAX = 500;

/** Le serveur plafonne `limit` à 100 : les noms au-delà restent en `#id`. */
const LABELS_LIMIT = 100;

function nomDe(u: User | undefined, id: number): string {
  return u?.nom || u?.pseudo || `#${id}`;
}

function initiales(u: User): string {
  const source = u.nom || u.pseudo || String(u.alanyaID);
  return source.slice(0, 2).toUpperCase();
}

interface UserPickerProps {
  /** alanyaID sélectionnés. */
  value: number[];
  onChange: (ids: number[]) => void;
  disabled?: boolean;
  /** Nombre maximum de comptes sélectionnables. */
  max?: number;
  inputId?: string;
}

/**
 * Sélecteur de comptes : recherche par nom, pseudo, téléphone ou alanyaID.
 *
 * Les identifiants restent la seule valeur échangée avec le parent ; les noms
 * ne servent qu'à l'affichage. Ceux de la sélection sont résolus en une requête
 * (`GET /admin/users?ids=…`), les autres viennent des résultats de recherche.
 */
export function UserPicker({
  value,
  onChange,
  disabled = false,
  max = COHORT_IDS_MAX,
  inputId,
}: UserPickerProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [actif, setActif] = useState(0);
  const [annuaire, setAnnuaire] = useState<Record<number, User>>({});
  const listeId = useId();

  const recherche = useDebouncedValue(query.trim(), 300);
  const plein = value.length >= max;

  const { data: resultats, isFetching } = useUsers(
    { search: recherche, page: 1, limit: 8 },
    { enabled: open && recherche.length > 0 },
  );

  // Résout les noms de la sélection en une requête (cohortes existantes).
  const { data: selection } = useUsers(
    { ids: value, page: 1, limit: LABELS_LIMIT },
    { enabled: value.length > 0 },
  );

  // Mémorise les comptes déjà vus : la liste de suggestions change à chaque
  // frappe, les puces ne doivent pas perdre leur nom pour autant.
  useEffect(() => {
    const trouves = [...(resultats?.items ?? []), ...(selection?.items ?? [])];
    if (!trouves.length) return;
    setAnnuaire((prev) => {
      let change = false;
      const next = { ...prev };
      for (const u of trouves) {
        if (!next[u.alanyaID]) {
          next[u.alanyaID] = u;
          change = true;
        }
      }
      return change ? next : prev;
    });
  }, [resultats, selection]);

  const suggestions = useMemo(
    () => (resultats?.items ?? []).filter((u) => !value.includes(u.alanyaID)),
    [resultats, value],
  );

  useEffect(() => {
    setActif(0);
  }, [recherche, suggestions.length]);

  function ajouter(id: number) {
    if (disabled || plein || value.includes(id)) return;
    onChange([...value, id]);
    setQuery("");
    setOpen(true);
  }

  function retirer(id: number) {
    if (disabled) return;
    onChange(value.filter((v) => v !== id));
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!open || !suggestions.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActif((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActif((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      ajouter(suggestions[actif]?.alanyaID);
    }
  }

  const afficherListe = open && recherche.length > 0 && !plein;

  return (
    <div
      className="relative"
      onFocus={() => setOpen(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      {value.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {value.map((id) => {
            const u = annuaire[id];
            return (
              <span
                key={id}
                className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 py-1 pl-2.5 pr-1 text-xs dark:border-zinc-700 dark:bg-zinc-800"
              >
                <span className="truncate font-medium">{nomDe(u, id)}</span>
                <span className="shrink-0 font-mono text-zinc-500">#{id}</span>
                <button
                  type="button"
                  onClick={() => retirer(id)}
                  disabled={disabled}
                  aria-label={`Retirer ${nomDe(u, id)} (alanyaID ${id})`}
                  className="rounded-full p-0.5 text-zinc-400 transition-colors hover:bg-zinc-200 hover:text-zinc-700 disabled:pointer-events-none disabled:opacity-50 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <Input
          id={inputId}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={
            plein ? `Plafond de ${max} comptes atteint` : "Rechercher par nom ou alanyaID…"
          }
          disabled={disabled || plein}
          role="combobox"
          aria-expanded={afficherListe}
          aria-controls={listeId}
          aria-autocomplete="list"
          autoComplete="off"
          className="pl-9 pr-9"
        />
        {isFetching && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-zinc-400" />
        )}
      </div>

      {afficherListe && (
        <div
          id={listeId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
        >
          {suggestions.length === 0 ? (
            <p className="px-3 py-2 text-sm text-zinc-500">
              {isFetching ? "Recherche…" : "Aucun compte trouvé."}
            </p>
          ) : (
            suggestions.map((u, i) => (
              <button
                key={u.alanyaID}
                type="button"
                role="option"
                aria-selected={i === actif}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActif(i)}
                onClick={() => ajouter(u.alanyaID)}
                className={cn(
                  "flex w-full items-center gap-3 px-3 py-2 text-left transition-colors",
                  i === actif ? "bg-indigo-50 dark:bg-indigo-950/40" : "hover:bg-zinc-50 dark:hover:bg-zinc-800",
                )}
              >
                <Avatar className="h-8 w-8">
                  {u.avatarUrl ? <AvatarImage src={u.avatarUrl} alt="" /> : null}
                  <AvatarFallback className="text-[11px]">{initiales(u)}</AvatarFallback>
                </Avatar>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{nomDe(u, u.alanyaID)}</span>
                  <span className="block truncate text-xs text-zinc-500">
                    {u.pseudo ? `@${u.pseudo} · ` : ""}#{u.alanyaID}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
