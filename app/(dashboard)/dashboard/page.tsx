"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { StatCard } from "@/components/dashboard/StatCard";
import { AreaChart } from "@/components/dashboard/AreaChart";
import { BarChart } from "@/components/dashboard/BarChart";
import { PieChart } from "@/components/dashboard/PieChart";
import { TopCountries } from "@/components/dashboard/TopCountries";
import { TopUsersTable } from "@/components/dashboard/TopUsersTable";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { DashboardContentSkeleton } from "@/components/skeletons";
import { useStats, useActivityFeed } from "@/hooks/useAdmin";
import { useAnalytics } from "@/hooks/useAnalytics";
import { DashboardBanner } from "@/components/dashboard/DashboardBanner";
import { ReportsOverview } from "@/components/dashboard/ReportsOverview";
import { getAdminUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Users,
  Activity,
  Ban,
  MessageSquare,
  Phone,
  Smile,
  RefreshCw,
  TrendingUp,
  BarChart3,
  PieChart as PieChartIcon,
} from "lucide-react";

function subDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() - n);
  return r.toISOString().split("T")[0];
}

export default function DashboardPage() {
  const router = useRouter();
  const [period, setPeriod] = useState("7");
  const to = new Date().toISOString().split("T")[0];
  const from = useMemo(() => subDays(new Date(), parseInt(period)), [period]);

  const { data: stats, isLoading, isFetching, isError, refetch } = useStats(from, to);
  const { data: activity, isLoading: activityLoading } = useActivityFeed();
  const { data: analytics } = useAnalytics(from, to);

  const trend = (current?: number, previous?: number) => {
    if (current == null || !previous) return undefined;
    const pct = Math.round(((current - previous) / previous) * 100);
    return { value: pct, positive: pct >= 0 };
  };

  const userBreakdown = useMemo(() => {
    if (!stats) return [];
    return [
      { name: "En ligne", value: stats.onlineUsers },
      { name: "Hors ligne", value: stats.totalUsers - stats.onlineUsers - stats.bannedUsers },
      { name: "Bannis", value: stats.bannedUsers },
    ];
  }, [stats]);

  const activityComparison = useMemo(() => {
    if (!stats) return [];
    return [
      { label: "Messages", value: stats.messagesPeriod },
      { label: "Appels", value: stats.callsPeriod },
      { label: "Statuts", value: stats.statusesPeriod },
    ];
  }, [stats]);

  const countryPie = useMemo(() => {
    if (!stats) return [];
    return stats.topCountries.slice(0, 7).map((c) => ({
      name: c.pays,
      value: c.users,
    }));
  }, [stats]);

  const totalActivity = stats ? stats.messagesPeriod + stats.callsPeriod + stats.statusesPeriod : 0;
  const showSkeleton = isLoading || isFetching;

  const user = getAdminUser();

  return (
    <div className="space-y-6">
      <DashboardBanner
        adminName={user?.nom || user?.email}
        onlineUsers={stats?.onlineUsers}
        messagesToday={stats?.messagesPeriod}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Vue d&apos;ensemble de l&apos;activité Alanya
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            disabled={isLoading}
            className="flex h-10 w-32 items-center rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <option value="7">7 jours</option>
            <option value="30">30 jours</option>
            <option value="90">90 jours</option>
          </select>
          <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isFetching} className="shrink-0">
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {isError && (
        <div className="text-center py-12">
          <p className="text-red-500 text-sm mb-3">Erreur de chargement</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>Réessayer</Button>
        </div>
      )}

      {!isError && showSkeleton && <DashboardContentSkeleton />}

      {!isError && !showSkeleton && stats && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <StatCard title="Utilisateurs" value={stats.totalUsers} icon={Users} color="#6366f1" subtitle="total" onClick={() => router.push("/users")} />
            <StatCard title="En ligne" value={stats.onlineUsers} icon={Activity} color="#22c55e" subtitle="maintenant" onClick={() => router.push("/users?status=online")} />
            <StatCard title="Bannis" value={stats.bannedUsers} icon={Ban} color="#ef4444" subtitle="total" onClick={() => router.push("/users?status=banned")} />
            <StatCard title="Messages" value={stats.messagesPeriod} icon={MessageSquare} color="#3b82f6" subtitle="cette période" trend={trend(stats.messagesPeriod, analytics?.comparison.messages)} onClick={() => router.push("/analytics")} />
            <StatCard title="Appels" value={stats.callsPeriod} icon={Phone} color="#8b5cf6" subtitle="cette période" trend={trend(stats.callsPeriod, analytics?.comparison.calls)} onClick={() => router.push("/analytics")} />
            <StatCard title="Statuts" value={stats.statusesPeriod} icon={Smile} color="#f59e0b" subtitle="cette période" trend={trend(stats.statusesPeriod, analytics?.comparison.statuses)} onClick={() => router.push("/analytics")} />
          </div>

          {/* La file de modération se voit d'ici : un signalement ignoré est un
              signalement traité demain. La décision reste sur /reports. */}
          <ReportsOverview />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <AreaChart data={stats.registrations} title="Inscriptions par jour" />
            </div>
            <PieChart data={userBreakdown} title="Statut des utilisateurs" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <BarChart data={activityComparison} title="Activité sur la période" color="#6366f1" />
            </div>
            <PieChart data={countryPie} title="Top pays" />
          </div>

          <TopCountries data={stats.topCountries} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <TopUsersTable data={stats.topUsers} />
            </div>
            <ActivityFeed data={activity} isLoading={activityLoading} />
          </div>

          <div className="flex flex-wrap gap-4 p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 text-sm">
            <span className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-indigo-600" />
              <strong className="text-indigo-700 dark:text-indigo-300">{totalActivity.toLocaleString()}</strong> actions totales
            </span>
            <span className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-indigo-600" />
              <strong className="text-indigo-700 dark:text-indigo-300">{stats.totalUsers.toLocaleString()}</strong> utilisateurs
            </span>
            <span className="flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-indigo-600" />
              <strong className="text-indigo-700 dark:text-indigo-300">{stats.topCountries.length}</strong> pays représentés
            </span>
          </div>
        </>
      )}
    </div>
  );
}
