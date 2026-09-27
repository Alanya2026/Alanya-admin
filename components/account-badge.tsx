import { BadgeCheck, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  OFFICIAL_SEAL_GOLD,
  VERIFIED_INDIGO,
  resolveAccountBadge,
  sealPath,
} from "@/lib/account-badge";

// Réexportés : les écrans importent la logique depuis le composant.
export {
  OFFICIAL_SEAL_GOLD,
  VERIFIED_INDIGO,
  resolveAccountBadge,
  isOfficialAlanyaAccount,
  sealPath,
} from "@/lib/account-badge";
export type { AccountBadgeKind } from "@/lib/account-badge";

const SEAL_PATH = sealPath();

function VerifiedSeal({ size, className }: { size: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      role="img"
      aria-label="Compte vérifié"
      className={cn("shrink-0", className)}
    >
      <path d={SEAL_PATH} fill={VERIFIED_INDIGO} />
      <path
        d="M6.6 12.4 10.1 15.9 17.6 8.2"
        transform="translate(12 12) scale(0.86) translate(-12 -12)"
        fill="none"
        stroke="#fff"
        strokeWidth={2.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface AccountBadgeIconProps {
  accountType: number;
  verificationStatus: number;
  size?: number;
  className?: string;
  /** Contour du sceau officiel (ex. fond app bar en preview). Défaut : blanc. */
  sealStroke?: string;
}

/** Miroir de `AccountBadgeIcon` — account_badge.dart */
export function AccountBadgeIcon({
  accountType,
  verificationStatus,
  size = 14,
  className,
  sealStroke = "white",
}: AccountBadgeIconProps) {
  const badge = resolveAccountBadge(accountType, verificationStatus);
  if (badge === "none") return null;

  if (badge === "cocheVerifiee") {
    return <VerifiedSeal size={size} className={className} />;
  }

  if (badge === "officiel") {
    return (
      <BadgeCheck
        size={size}
        className={cn("shrink-0", className)}
        style={{ color: OFFICIAL_SEAL_GOLD }}
        fill={OFFICIAL_SEAL_GOLD}
        stroke={sealStroke}
      />
    );
  }

  if (badge === "panierVerifie") {
    return (
      <ShoppingBag
        size={size}
        className={cn("shrink-0 text-green-700 dark:text-green-500", className)}
      />
    );
  }

  return (
    <ShoppingBag
      size={size}
      className={cn("shrink-0 text-slate-500 dark:text-slate-400", className)}
      strokeWidth={1.5}
    />
  );
}

interface AccountBadgeLabelProps {
  name: string;
  accountType: number;
  verificationStatus: number;
  className?: string;
  nameClassName?: string;
  /** Taille de base du texte pour calculer l'icône (fontSize + 2). */
  fontSize?: number;
  sealStroke?: string;
}

/** Miroir de `AccountBadgeLabel` — account_badge.dart */
export function AccountBadgeLabel({
  name,
  accountType,
  verificationStatus,
  className,
  nameClassName,
  fontSize = 14,
  sealStroke,
}: AccountBadgeLabelProps) {
  const badge = resolveAccountBadge(accountType, verificationStatus);
  return (
    <span className={cn("inline-flex min-w-0 max-w-full items-center", className)}>
      <span className={cn("truncate", nameClassName)}>{name}</span>
      {badge !== "none" ? (
        <AccountBadgeIcon
          accountType={accountType}
          verificationStatus={verificationStatus}
          size={fontSize + 2}
          className="ml-1"
          sealStroke={sealStroke}
        />
      ) : null}
    </span>
  );
}
