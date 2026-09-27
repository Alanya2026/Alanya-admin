import { describe, expect, it } from "vitest";
import { docTypeLabel, reasonIsValid, sameName } from "./verification-labels";

describe("sameName", () => {
  it("ignore la casse et les espaces, comme le serveur", () => {
    expect(sameName("Marie Kouassi", "  marie   KOUASSI ")).toBe(true);
    expect(sameName("Marie Kouassi", "Marie Kouassi-Diallo")).toBe(false);
    expect(sameName(null, "")).toBe(true);
  });
});

describe("reasonIsValid", () => {
  it("trois caractères au moins", () => {
    expect(reasonIsValid("  ok ")).toBe(false);
    expect(reasonIsValid("Pièce illisible")).toBe(true);
  });
});

describe("docTypeLabel", () => {
  it("nomme la pièce et le selfie", () => {
    expect(docTypeLabel(1)).toBe("Pièce d'identité");
    expect(docTypeLabel(4)).toBe("Selfie avec la pièce");
    expect(docTypeLabel(9)).toBe("Pièce");
  });
});
