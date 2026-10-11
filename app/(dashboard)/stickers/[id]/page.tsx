"use client";

import { useParams } from "next/navigation";
import { StickerPackEditor } from "@/components/stickers/StickerPackEditor";

/**
 * Fiche d'un pack. Une adresse stable par pack : partageable et rechargeable.
 * `reglages` et `signalements` sont des segments statiques, résolus avant
 * `[id]` — inutile de les exclure ici.
 */
export default function StickerPackPage() {
  const params = useParams();
  const id = Number.parseInt(params.id as string, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return <p className="py-20 text-center text-sm text-zinc-500">Pack introuvable.</p>;
  }
  return <StickerPackEditor id={id} />;
}
