import { describe, it, expect } from "vitest";
import {
  ALL_NAV_ITEMS,
  DEFAULT_PINNED_HREFS,
  DEFAULT_PINNED_NAV,
  MAX_PINNED,
  NAV_GROUPS,
  SECONDARY_NAV,
  buildSidebar,
  findActiveGroup,
  isNavItemActive,
  keepKnownGroupIds,
  keepKnownNavHrefs,
  movePinnedHref,
  resolvePinned,
  togglePinnedHref,
} from "./nav";

const allPermissions = () => true;

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

  it("épingle trois raccourcis par défaut", () => {
    expect(DEFAULT_PINNED_NAV).toHaveLength(3);
    expect(DEFAULT_PINNED_HREFS).toEqual(["/dashboard", "/users", "/reports"]);
    expect(NAV_GROUPS).toHaveLength(5);
    expect(SECONDARY_NAV).toHaveLength(1);
  });

  it("range chaque épingle par défaut dans une section", () => {
    // Sans cela, désépingler Dashboard le ferait disparaître de la barre.
    const grouped = new Set(NAV_GROUPS.flatMap((g) => g.items.map((i) => i.href)));
    for (const href of DEFAULT_PINNED_HREFS) {
      expect(grouped.has(href), href).toBe(true);
    }
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
    expect(findActiveGroup("/dashboard")).toBe("pilotage");
    expect(findActiveGroup("/users/new")).toBe("communaute");
  });

  it("retourne null pour une entrée hors sections", () => {
    expect(findActiveGroup("/billing/plans")).toBeNull();
  });

  it("ne signale pas la section d'une entrée épinglée", () => {
    const { groups } = buildSidebar({ pinnedHrefs: DEFAULT_PINNED_HREFS, can: allPermissions });
    expect(findActiveGroup("/dashboard", groups)).toBeNull();
    expect(findActiveGroup("/trips", groups)).toBe("confiance");
  });
});

describe("togglePinnedHref", () => {
  it("épingle et dépingle en conservant l'ordre d'ajout", () => {
    let pins = ["/dashboard"];
    pins = togglePinnedHref(pins, "/groups");
    pins = togglePinnedHref(pins, "/trips");
    expect(pins).toEqual(["/dashboard", "/groups", "/trips"]);
    expect(togglePinnedHref(pins, "/groups")).toEqual(["/dashboard", "/trips"]);
  });

  it("refuse une sixième épingle", () => {
    const pins = ["/dashboard", "/users", "/reports", "/groups", "/trips"];
    expect(pins).toHaveLength(MAX_PINNED);
    expect(togglePinnedHref(pins, "/stickers")).toBe(pins);
  });

  it("permet de tout dépinger", () => {
    expect(togglePinnedHref(["/dashboard"], "/dashboard")).toEqual([]);
  });
});

describe("movePinnedHref", () => {
  it("échange deux épingles voisines dans les deux sens", () => {
    const pins = ["/dashboard", "/users", "/reports"];
    expect(movePinnedHref(pins, "/reports", "/users")).toEqual(["/dashboard", "/reports", "/users"]);
    expect(movePinnedHref(pins, "/dashboard", "/users")).toEqual(["/users", "/dashboard", "/reports"]);
  });

  it("ne change rien sur une adresse inconnue ou une cible identique", () => {
    const pins = ["/dashboard", "/users"];
    expect(movePinnedHref(pins, "/inconnue", "/users")).toBe(pins);
    expect(movePinnedHref(pins, "/dashboard", "/dashboard")).toBe(pins);
  });
});

describe("resolvePinned", () => {
  it("respecte l'ordre mémorisé et ignore les routes inconnues", () => {
    expect(resolvePinned(["/stickers", "/inconnue", "/dashboard"]).map((i) => i.label)).toEqual([
      "Stickers",
      "Dashboard",
    ]);
  });
});

describe("buildSidebar", () => {
  it("place les épingles en tête et les retire de leur section", () => {
    const { pinned, groups } = buildSidebar({
      pinnedHrefs: ["/dashboard", "/groups"],
      can: allPermissions,
    });
    expect(pinned.map((item) => item.label)).toEqual(["Dashboard", "Groupes"]);
    expect(groups.find((g) => g.id === "communaute")?.items.map((i) => i.label)).toEqual([
      "Utilisateurs",
      "Réunions",
    ]);
  });

  it("garde les raccourcis par défaut dans leur section une fois désépinglés", () => {
    const { pinned, groups } = buildSidebar({ pinnedHrefs: [], can: allPermissions });
    expect(pinned).toEqual([]);
    const byHref = new Map(groups.flatMap((g) => g.items.map((i) => [i.href, g.id])));
    expect(byHref.get("/dashboard")).toBe("pilotage");
    expect(byHref.get("/users")).toBe("communaute");
    expect(byHref.get("/reports")).toBe("confiance");
  });

  it("retire une section devenue vide", () => {
    const { groups } = buildSidebar({
      pinnedHrefs: ["/broadcasts", "/welcome", "/stickers"],
      can: allPermissions,
    });
    expect(groups.map((g) => g.id)).not.toContain("contenus");
  });

  it("peut épingler une entrée du pied de barre", () => {
    const { pinned, secondary } = buildSidebar({
      pinnedHrefs: ["/billing"],
      can: allPermissions,
    });
    expect(pinned.map((item) => item.href)).toEqual(["/billing"]);
    expect(secondary).toEqual([]);
  });

  it("fait retomber une épingle interdite dans sa section, sans trou", () => {
    const can = (permission: string) => permission !== "groups.read";
    const { pinned, groups } = buildSidebar({ pinnedHrefs: ["/groups", "/reports"], can });
    expect(pinned.map((item) => item.href)).toEqual(["/reports"]);
    expect(groups.find((g) => g.id === "communaute")?.items.map((i) => i.href)).toEqual([
      "/users",
      "/meetings",
    ]);
  });

  it("ne laisse rien quand aucun droit n'est accordé", () => {
    const { pinned, groups, secondary } = buildSidebar({
      pinnedHrefs: DEFAULT_PINNED_HREFS,
      can: () => false,
    });
    expect(pinned).toEqual([]);
    expect(groups).toEqual([]);
    expect(secondary).toEqual([]);
  });
});

describe("keepKnownGroupIds", () => {
  it("ignore les identifiants inconnus et les valeurs non textuelles", () => {
    expect(keepKnownGroupIds(["pilotage", "inconnu", 3, null])).toEqual(["pilotage"]);
    expect(keepKnownGroupIds({ pilotage: true })).toEqual([]);
    expect(keepKnownGroupIds(null)).toEqual([]);
  });
});

describe("keepKnownNavHrefs", () => {
  it("dédoublonne, ignore l'inconnu et plafonne à cinq", () => {
    expect(
      keepKnownNavHrefs(["/users", "/users", "/inconnue", "/trips", "/groups", "/stickers", "/audit", "/purges"]),
    ).toEqual(["/users", "/trips", "/groups", "/stickers", "/audit"]);
  });

  it("distingue une liste vide d'une valeur illisible", () => {
    expect(keepKnownNavHrefs([])).toEqual([]);
    expect(keepKnownNavHrefs(null)).toBeNull();
    expect(keepKnownNavHrefs("[]")).toBeNull();
  });
});
