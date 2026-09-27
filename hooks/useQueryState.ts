"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type QueryValues<T extends Record<string, string>> = Partial<Record<keyof T, string | undefined>>;

/**
 * État synchronisé avec l'URL : la source de vérité est l'URL, l'état ne fait
 * que la refléter. Les vues filtrées deviennent partageables, bookmarkables,
 * et le bouton « retour » du navigateur déroule l'historique des filtres.
 *
 * Absent de l'URL = valeur par défaut ; `""` et `undefined` suppriment le
 * paramètre plutôt que de le laisser vide.
 */
export function useQueryStates<T extends Record<string, string>>(defaults: T) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const state = useMemo(() => {
    const out = {} as Record<keyof T, string>;
    for (const key of Object.keys(defaults)) {
      out[key as keyof T] = searchParams.get(key) ?? defaults[key];
    }
    return out as T;
    // defaults est un littéral stable fourni par l'appelant.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const setValues = useCallback(
    (updates: QueryValues<T>) => {
      const params = new URLSearchParams(window.location.search);
      for (const [key, value] of Object.entries(updates)) {
        if (value == null || value === "") params.delete(key);
        else params.set(key, value);
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router]
  );

  return [state, setValues] as const;
}
