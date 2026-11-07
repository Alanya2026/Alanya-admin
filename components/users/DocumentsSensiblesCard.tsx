"use client";

/**
 * Encart « Documents sensibles » de la fiche d'un compte (super-admin).
 *
 * Des nombres seulement : les empreintes et le détail passent par la page
 * d'enquête, qui exige un motif et journalise chaque recherche.
 */

import Link from "next/link";
import { Fingerprint } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDocumentsSensiblesResume } from "@/hooks/useDocumentsSensibles";
import { dateEnquete } from "@/lib/empreinte";

function Chiffre({ label, valeur }: { label: string; valeur: number }) {
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className="text-zinc-500">{label}</span>
      <span className="font-medium tabular-nums">{valeur}</span>
    </div>
  );
}

export function DocumentsSensiblesCard({ userId }: { userId: number }) {
  const { data, isLoading, isError } = useDocumentsSensiblesResume(userId, true);

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Fingerprint className="h-4 w-4 text-indigo-600" /> Documents sensibles
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : isError || !data ? (
          <p className="text-sm text-zinc-500">Indisponible.</p>
        ) : (
          <>
            <Chiffre label="Consultations" valeur={data.consultations} />
            <Chiffre label="Copies signées sorties" valeur={data.copies} />
            <Chiffre label="Copies de ses envois, par d'autres" valeur={data.copiesDeSesEnvois} />
            {data.derniereCopie && (
              <p className="pt-1 text-xs text-zinc-500">
                Dernière copie sortie le {dateEnquete(data.derniereCopie).locale}
              </p>
            )}
            <Link
              href="/documents-sensibles"
              className="mt-3 inline-block text-xs text-indigo-600 hover:underline"
            >
              Vérifier une empreinte →
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  );
}
