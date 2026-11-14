import { describe, expect, it } from "vitest";
import { batchError, codesToCsv, csvFileName, parseWhole } from "./billing-codes";
import type { BillingCodesGenerated } from "@/types";

const generated: BillingCodesGenerated = {
  codes: [
    { id: 1, code: "7K2QX-M9P4B-T3VHE", hint: "3VHE" },
    { id: 2, code: "AAAAA-BBBBB-CCCCC", hint: "CCCC" },
  ],
  plan: { code: "plus_annuel", durationMonths: 12, price: 1000, currency: "XAF" },
  expiresAt: "2027-10-03T10:00:00.000Z",
};

describe("saisie du lot", () => {
  it("entiers stricts", () => {
    expect(parseWhole("12")).toBe(12);
    expect(parseWhole(" 7 ")).toBe(7);
    expect(parseWhole("12,5")).toBeNull();
    expect(parseWhole("-1")).toBeNull();
    expect(parseWhole("")).toBeNull();
  });

  it("bornes du lot et de la validité, comme le serveur", () => {
    expect(batchError("10", "365")).toBeNull();
    expect(batchError("200", "730")).toBeNull();
    expect(batchError("0", "365")).toMatch(/1 à 200/);
    expect(batchError("201", "365")).toMatch(/1 à 200/);
    expect(batchError("abc", "365")).toMatch(/1 à 200/);
    expect(batchError("10", "0")).toMatch(/1 à 730/);
    expect(batchError("10", "731")).toMatch(/1 à 730/);
  });
});

describe("export CSV", () => {
  it("un code par ligne, avec ce qu'il vaut et jusqu'à quand", () => {
    const csv = codesToCsv(generated, "Vendeur Douala");
    expect(csv.split("\n")).toEqual([
      "code,libelle,duree_mois,prix,devise,expire_le",
      "7K2QX-M9P4B-T3VHE,Vendeur Douala,12,1000,XAF,2027-10-03",
      "AAAAA-BBBBB-CCCCC,Vendeur Douala,12,1000,XAF,2027-10-03",
      "",
    ]);
  });

  it("protège les guillemets, virgules et retours d'un libellé", () => {
    const csv = codesToCsv({ ...generated, codes: [generated.codes[0]] }, 'Lot "A", Yaoundé');
    expect(csv.split("\n")[1]).toBe('7K2QX-M9P4B-T3VHE,"Lot ""A"", Yaoundé",12,1000,XAF,2027-10-03');
  });

  it("sans plan, les colonnes restent vides", () => {
    const csv = codesToCsv({ ...generated, plan: null, codes: [generated.codes[0]] });
    expect(csv.split("\n")[1]).toBe("7K2QX-M9P4B-T3VHE,,,,,2027-10-03");
  });
});

describe("nom de fichier", () => {
  const now = new Date("2026-10-03T10:00:00Z");
  it("daté, libellé nettoyé", () => {
    expect(csvFileName("Vendeur Douala / été", now)).toBe("codes-alanya-2026-10-03-vendeur-douala-ete.csv");
    expect(csvFileName(undefined, now)).toBe("codes-alanya-2026-10-03.csv");
    expect(csvFileName("../../etc", now)).toBe("codes-alanya-2026-10-03-etc.csv");
  });
});
