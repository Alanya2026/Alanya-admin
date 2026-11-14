"use client";

import { RefreshCw, Sticker } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { StickersNav } from "./StickersNav";

/**
 * En-tête commun des écrans de stickers : titre, phrase de la section,
 * actualisation, actions facultatives, puis la sous-navigation filtrée par
 * permission.
 */
export function StickersPageHeader({
  subtitle,
  refreshing,
  onRefresh,
  actions,
}: {
  subtitle: string;
  refreshing?: boolean;
  onRefresh?: () => void;
  actions?: React.ReactNode;
}) {
  return (
    <>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Sticker className="h-6 w-6 text-indigo-500" />
            Stickers
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {actions}
          {onRefresh && (
            <Button
              variant="outline"
              size="icon"
              onClick={onRefresh}
              disabled={refreshing}
              aria-label="Actualiser"
            >
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            </Button>
          )}
        </div>
      </div>
      <StickersNav />
    </>
  );
}
