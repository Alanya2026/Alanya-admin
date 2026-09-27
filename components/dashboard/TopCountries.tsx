"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCountries } from "@/hooks/useCountries";

interface Country {
  pays: string;
  users: number;
}

interface TopCountriesProps {
  data: Country[];
}

function getFlag(pays: string): string {
  const flags: Record<string, string> = {
    France: "🇫🇷",
    "Côte d'Ivoire": "🇨🇮",
    Cameroun: "🇨🇲",
    Sénégal: "🇸🇳",
    Maroc: "🇲🇦",
    Algérie: "🇩🇿",
    Tunisie: "🇹🇳",
    Belgique: "🇧🇪",
    Canada: "🇨🇦",
    Suisse: "🇨🇭",
  };
  return flags[pays] || "🌍";
}

export function TopCountries({ data }: TopCountriesProps) {
  const max = Math.max(...data.map((c) => c.users));
  const router = useRouter();
  const { data: countries } = useCountries();

  function handleCountryClick(pays: string) {
    const id = countries?.find((c) => c.libelle === pays)?.idPays;
    router.push(id != null ? `/users?idPays=${id}` : "/users");
  }

  return (
    <Card className="border-0 shadow-sm bg-white dark:bg-zinc-900">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Top Pays</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.map((country) => (
          <div
            key={country.pays}
            onClick={() => handleCountryClick(country.pays)}
            className="flex items-center gap-3 px-2 -mx-2 py-1.5 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer group"
          >
            <span className="text-lg shrink-0 w-7">{getFlag(country.pays)}</span>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{country.pays}</span>
                <span className="text-sm text-zinc-500">{country.users.toLocaleString()}</span>
              </div>
              <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-400 transition-all duration-500"
                  style={{ width: `${(country.users / max) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ))}
        <button
          onClick={() => router.push("/geolocation")}
          className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:underline mt-2 pt-2 border-t dark:border-zinc-800 w-full justify-center"
        >
          <MapPin className="h-3.5 w-3.5" />
          Voir la carte
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </CardContent>
    </Card>
  );
}
