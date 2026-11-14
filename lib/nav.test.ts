import { describe, it, expect } from "vitest";
import {
  ALL_NAV_ITEMS,
  NAV_GROUPS,
  PINNED_NAV,
  SECONDARY_NAV,
  findActiveGroup,
  isNavItemActive,
  keepKnownGroupIds,
  visibleGroups,
} from "./nav";

describe("plan de navigation", () => {
  it("range les 21 destinations hors profil, sans doublon", () => {
    expect(ALL_NAV_ITEMS).toHaveLength(21);
    const hrefs = ALL_NAV_ITEMS.map((item) => item.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("garde les cinq sections de la stratégie A", () => {
    expect(NAV_GROUPS.map((g) => g.label)).toEqual([
      "Pilotage",
      "Communauté",
      "Contenus & diffusion",
      "Confiance & sécurité",
      "Système & données",
    ]);
  });

  it("ne dépasse pas cinq entrées par section", () => {
    for (const group of NAV_GROUPS) {
      expect(group.items.length, group.label).toBeLessThanOrEqual(5);
    }
  });

  it("n'affiche que neuf points d'entrée au repos", () => {
    // 3 épinglées + 5 sections + Abonnement.
    expect(PINNED_NAV).toHaveLength(3);
    expect(NAV_GROUPS).toHaveLength(5);
    expect(SECONDARY_NAV).toHaveLength(1);
  });
});

describe("isNavItemActive", () => {
  it("reconnaît la page et ses sous-pages", () => {
    expect(isNavItemActive("/users", "/users")).toBe(true);
    expect(isNavItemActive("/users/new", "/users")).toBe(true);
    expect(isNavItemActive("/users-archive", "/users")).toBe(false);
  });
});

describe("findActiveGroup", () => {
  it("ouvre la section de la page courante, y compris sur une sous-page", () => {
    expect(findActiveGroup("/trips/retention")).toBe("confiance");
    expect(findActiveGroup("/settings/reserved-alanya-phones")).toBe("systeme");
    expect(findActiveGroup("/analytics")).toBe("pilotage");
  });

  it("retourne null pour une entrée épinglée ou hors menu", () => {
    expect(findActiveGroup("/users/new")).toBeNull();
    expect(findActiveGroup("/billing/plans")).toBeNull();
    expect(findActiveGroup("/audit")).toBe("systeme");
  });
});

describe("visibleGroups", () => {
  it("retire les entrées interdites et les sections devenues vides", () => {
    const groups = visibleGroups(NAV_GROUPS, (p) => p === "stats.read");
    expect(groups.map((g) => g.id)).toEqual(["pilotage", "systeme"]);
    expect(groups[1].items.map((i) => i.label)).toEqual(["Sauvegardes"]);
  });

  it("ne laisse rien quand aucun droit n'est accordé", () => {
    expect(visibleGroups(NAV_GROUPS, () => false)).toEqual([]);
  });
});

describe("keepKnownGroupIds", () => {
  it("ignore les identifiants inconnus et les valeurs non textuelles", () => {
    expect(keepKnownGroupIds(["pilotage", "inconnu", 3, null])).toEqual(["pilotage"]);
    expect(keepKnownGroupIds({ pilotage: true })).toEqual([]);
    expect(keepKnownGroupIds(null)).toEqual([]);
  });
});
