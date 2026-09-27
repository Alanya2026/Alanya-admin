/**
 * Constructeurs de query params — le miroir côté front du contrat backend.
 *
 * Le backend mélange deux conventions (cf. src/controllers/admin/usersQuery.js) :
 *  - `idPays` en camelCase, nom de la colonne MySQL tel quel ;
 *  - `account_type` en snake_case.
 * Aucun middleware ne reconvertit la casse : ce qui est envoyé est reçu tel
 * quel, donc un param mal nommé est silencieusement ignoré. Ces builders
 * centralisent la correspondance pour qu'une régression ne se produise qu'ici.
 */

// `backup_last_at` : page Sauvegardes, les comptes les plus anciennement
// sauvegardés d'abord (usersQuery.js le connaît).
export const USER_SORT_COLUMNS = ["created_at", "nom", "last_seen", "backup_last_at"] as const;
export type UserSortColumn = (typeof USER_SORT_COLUMNS)[number];
export type OrderDir = "asc" | "desc";

export interface UsersApiParams {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
  idPays?: string | number;
  accountType?: string | number;
  typeCompte?: string | number;
  from?: string;
  to?: string;
  sort?: UserSortColumn;
  order?: OrderDir;
  /** `never` | `stale` | `recent` — état de sauvegarde du compte. */
  backup?: string;
}

/**
 * Query params de GET /admin/users et de son export — mêmes filtres, mêmes
 * noms. Colonne de tri inconnue → `created_at` (comportement serveur),
 * ordre non-`asc` → `desc` (défaut serveur), valeurs vides supprimées.
 */
export function buildUsersApiParams(query: UsersApiParams): Record<string, string | number | undefined> {
  const params: Record<string, string | number | undefined> = {};

  if (query.search) params.search = query.search;
  if (query.status) params.status = query.status;
  if (query.from) params.from = query.from;
  if (query.to) params.to = query.to;

  // Filtre pays : camelCase (colonne MySQL).
  if (query.idPays != null && query.idPays !== "") params.idPays = query.idPays;
  // Type de compte : snake_case.
  if (query.accountType != null && query.accountType !== "") {
    params.account_type = query.accountType;
  }
  // Rôle : snake_case.
  if (query.typeCompte != null && query.typeCompte !== "") {
    params.type_compte = query.typeCompte;
  }
  // État de sauvegarde : même nom des deux côtés.
  if (query.backup) params.backup = query.backup;

  const sort = USER_SORT_COLUMNS.includes(query.sort as UserSortColumn)
    ? (query.sort as UserSortColumn)
    : "created_at";
  if (sort !== "created_at") params.sort = sort;
  if (query.order === "asc") params.order = "asc";

  params.page = query.page ?? 1;
  params.limit = query.limit ?? 20;

  return params;
}
