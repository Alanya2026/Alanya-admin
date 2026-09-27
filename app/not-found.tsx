import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <div className="text-zinc-300 dark:text-zinc-700 mb-4">
        <Compass className="h-12 w-12 mx-auto" />
      </div>
      <h1 className="text-lg font-semibold">Page introuvable</h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
        Cette page n&apos;existe pas ou a été déplacée.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
      >
        Retour au tableau de bord
      </Link>
    </div>
  );
}
