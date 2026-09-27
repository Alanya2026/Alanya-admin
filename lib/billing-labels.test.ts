import { describe, expect, it } from "vitest";
import { addMonths, channelLabel, nextPeriodStart, paymentItemLabel, planLabel } from "./billing-labels";
import type { BillingPlan } from "@/types";

describe("addMonths", () => {
  it("ramène le jour à la fin du mois, comme le serveur", () => {
    expect(addMonths(new Date("2027-01-31T00:00:00Z"), 1).toISOString()).toBe("2027-02-28T00:00:00.000Z");
    expect(addMonths(new Date("2028-01-31T00:00:00Z"), 1).toISOString()).toBe("2028-02-29T00:00:00.000Z");
    expect(addMonths(new Date("2026-10-10T09:00:00Z"), 12).toISOString()).toBe("2027-10-10T09:00:00.000Z");
  });
});

describe("nextPeriodStart", () => {
  const now = new Date("2026-09-22T12:00:00Z");

  it("maintenant, sans abonnement ni grâce", () => {
    expect(nextPeriodStart(now, null, null).toISOString()).toBe(now.toISOString());
  });

  it("à la suite de l'abonnement en cours", () => {
    expect(nextPeriodStart(now, "2026-10-10T00:00:00Z", null).toISOString()).toBe("2026-10-10T00:00:00.000Z");
  });

  it("jamais avant la fin de la grâce", () => {
    expect(nextPeriodStart(now, null, "2026-10-01T00:00:00Z").toISOString()).toBe("2026-10-01T00:00:00.000Z");
  });

  it("une fin passée ne recule pas le départ", () => {
    expect(nextPeriodStart(now, "2026-01-01T00:00:00Z", "invalide").toISOString()).toBe(now.toISOString());
  });
});

describe("libellés", () => {
  it("moyens de paiement", () => {
    expect(channelLabel("orange_money")).toBe("Orange Money");
    expect(channelLabel("mtn_momo")).toBe("MTN MoMo");
    expect(channelLabel(null)).toBe("—");
  });

  it("nom du plan, sinon son code", () => {
    const plans = [{ code: "plus_annuel", nameI18n: { fr: "Annuel", en: "Yearly" } }] as unknown as BillingPlan[];
    expect(planLabel("plus_annuel", plans)).toBe("Annuel");
    expect(planLabel("plus_mensuel", plans)).toBe("plus_mensuel");
    expect(planLabel(null, plans)).toBe("—");
  });
});

describe("paymentItemLabel", () => {
  it("un achat de numéro n'a pas de plan", () => {
    expect(paymentItemLabel({ product: "phone", plan: null })).toBe("Numéro Alanya");
  });

  it("un abonnement garde le nom de son plan", () => {
    expect(paymentItemLabel({ product: "plus", plan: "plus_annuel" })).toBe("plus_annuel");
  });

  it("un serveur plus ancien n'envoie pas product : abonnement", () => {
    expect(paymentItemLabel({ plan: "plus_annuel" })).toBe("plus_annuel");
  });
});
