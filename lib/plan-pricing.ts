/**
 * L'argument de prix d'un plan, calculé — jamais saisi.
 *
 * « Soit 167 F par mois » et « 4 mois offerts » se déduisent du prix et de la
 * durée, comparés au plan mensuel. Modifier un prix met l'argument à jour ;
 * personne n'a à le réécrire, et il ne peut pas mentir.
 */

export interface PricedPlan {
  durationMonths: number;
  priceAmount: number;
}

/** Prix ramené au mois, arrondi à l'entier (le XAF n'a pas de sous-unité). */
export function monthlyEquivalent(plan: PricedPlan): number {
  if (!plan.durationMonths) return plan.priceAmount;
  return Math.round(plan.priceAmount / plan.durationMonths);
}

/**
 * Mois « offerts » par rapport au plan de référence (le mensuel) : ce que la
 * même durée coûterait au mois, moins le prix du plan, en mois entiers.
 * Zéro si le plan n'est pas plus avantageux, ou s'il n'y a pas de référence.
 */
export function monthsOffered(plan: PricedPlan, reference?: PricedPlan | null): number {
  if (!reference || reference.durationMonths !== 1 || plan.durationMonths <= 1) return 0;
  const monthly = reference.priceAmount;
  if (monthly <= 0) return 0;
  const saving = monthly * plan.durationMonths - plan.priceAmount;
  return saving > 0 ? Math.floor(saving / monthly) : 0;
}

/** Montant en francs CFA : « 2 000 F ». */
export function formatFcfa(amount: number): string {
  return `${Math.round(amount).toLocaleString("fr-FR")} F`;
}

/** « / mois », « / an », « / 3 mois ». */
export function periodSuffix(durationMonths: number): string {
  if (durationMonths === 1) return "/ mois";
  if (durationMonths === 12) return "/ an";
  return `/ ${durationMonths} mois`;
}

/** Le plan de référence : le mensuel actif, s'il y en a un. */
export function referencePlan<T extends PricedPlan & { isActive?: number | boolean }>(
  plans: T[],
): T | null {
  return plans.find((p) => p.durationMonths === 1 && (p.isActive ?? 1) ? true : false) ?? null;
}
