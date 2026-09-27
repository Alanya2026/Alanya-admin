"use client";

import { useState, useMemo } from "react";
import { StatCard } from "@/components/dashboard/StatCard";
import { AreaChart } from "@/components/dashboard/AreaChart";
import { PieChart } from "@/components/dashboard/PieChart";
import { StackedBarChart } from "@/components/dashboard/StackedBarChart";
import { HeatmapChart } from "@/components/dashboard/HeatmapChart";
import { AnalyticsContentSkeleton } from "@/components/skeletons";
import { useAnalytics } from "@/hooks/useAnalytics";
import { Button } from "@/components/ui/button";
import { DateRangeInputs } from "@/components/ui/date-range-inputs";
import { ExportDialog } from "@/components/export/ExportDialog";
import type { AdminExportParams } from "@/lib/admin-export";
import { PERIOD_OPTIONS, periodToRange } from "@/lib/period";
import {
  MessageSquare,
  Phone,
  Smile,
  UserPlus,
  Clock,
  CheckCircle2,
  Eye,
  Heart,
  Users,
  UsersRound,
  Video,
  RefreshCw,
  Radio,
  Download,
  Voicemail,
} from "lucide-react";

function formatDuration(s: number): string {
  if (!s) return "0s";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${sec}s`;
  return `${sec}s`;
}

/** `meeting.duree` est en minutes, pas en secondes — ne pas la passer à `formatDuration`. */
function formatMinutes(m: number): string {
  if (!m) return "0 min";
  const h = Math.floor(m / 60);
  const min = m % 60;
  if (h) return min ? `${h} h ${min} min` : `${h} h`;
  return `${min} min`;
}

function trend(current: number, previous: number) {
  if (!previous) return undefined;
  const pct = Math.round(((current - previous) / previous) * 100);
  return { value: pct, positive: pct >= 0 };
}

function formatDay(date: string) {
  return new Date(date).toLocaleDateString("fr", { weekday: "short", day: "numeric" });
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-semibold tracking-tight pt-2">{children}</h2>;
}

export default function AnalyticsPage() {
  const defaultRange = periodToRange("7d");
  const [period, setPeriod] = useState("7d");
  const [dateFrom, setDateFrom] = useState(defaultRange.from);
  const [dateTo, setDateTo] = useState(defaultRange.to);
  const [exportOpen, setExportOpen] = useState(false);

  const exportFilterParams: AdminExportParams = {
    from: dateFrom,
    to: dateTo,
  };

  function handlePeriodChange(value: string) {
    setPeriod(value);
    const { from, to } = periodToRange(value);
    setDateFrom(from);
    setDateTo(to);
  }

  function handleDateFromChange(value: string) {
    setPeriod("");
    setDateFrom(value);
  }

  function handleDateToChange(value: string) {
    setPeriod("");
    setDateTo(value);
  }

  const { data, isLoading, isFetching, isError, refetch } = useAnalytics(dateFrom, dateTo);

  const messagesTotal = useMemo(
    () => (data ? data.messagesByType.reduce((s, m) => s + m.count, 0) : 0),
    [data]
  );

  const messageTypePie = useMemo(
    () => (data ? data.messagesByType.map((m) => ({ name: m.label, value: m.count })) : []),
    [data]
  );
  const callTypePie = useMemo(
    () =>
      data
        ? [
            { name: "Audio", value: data.calls.audio },
            { name: "Vidéo", value: data.calls.video },
          ]
        : [],
    [data]
  );
  const callOutcomePie = useMemo(
    () =>
      data
        ? [
            { name: "Répondus", value: data.calls.answered },
            { name: "Manqués", value: data.calls.missed },
            { name: "Rejetés", value: data.calls.rejected },
            { name: "Répondeur (sans sonner)", value: data.calls.voicemail },
            { name: "Répondeur (après sonnerie)", value: data.calls.voicemailAfterRing },
          ]
        : [],
    [data]
  );
  const callConnectionModePie = useMemo(
    () =>
      data
        ? [
            { name: "Relay (TURN)", value: data.calls.relay },
            { name: "P2P direct", value: data.calls.p2p },
            { name: "Inconnu", value: data.calls.modeUnknown },
          ]
        : [],
    [data]
  );
  const storyTypePie = useMemo(
    () => (data ? data.stories.byType.map((m) => ({ name: m.label, value: m.count })) : []),
    [data]
  );
  const rolePie = useMemo(
    () => (data ? data.users.byRole.map((r) => ({ name: r.label, value: r.count })) : []),
    [data]
  );
  const devicePie = useMemo(
    () => (data ? data.devices.map((d) => ({ name: d.os, value: d.count })) : []),
    [data]
  );
  const parcPie = useMemo(
    () => (data ? data.activeDevices.map((d) => ({ name: d.os, value: d.count })) : []),
    [data]
  );
  const meetingPie = useMemo(
    () =>
      data
        ? [
            { name: "Ont rejoint", value: data.meetings.joined },
            { name: "Jamais rejoint", value: data.meetings.invitedNeverJoined },
          ]
        : [],
    [data]
  );

  const showSkeleton = isLoading || (isFetching && !data);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Analyse détaillée de l&apos;activité Alanya
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={period}
            onChange={(e) => handlePeriodChange(e.target.value)}
            disabled={isLoading}
            className="flex h-10 w-44 items-center rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            {PERIOD_OPTIONS.map((o) => (
              <option key={o.value || "all"} value={o.value}>{o.label}</option>
            ))}
          </select>
          <DateRangeInputs
            from={dateFrom}
            to={dateTo}
            onFromChange={handleDateFromChange}
            onToChange={handleDateToChange}
            disabled={isLoading}
          />
          <Button variant="outline" size="sm" onClick={() => setExportOpen(true)} disabled={isLoading} className="shrink-0">
            <Download className="h-4 w-4 mr-1" /> Exporter
          </Button>
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

      {!isError && showSkeleton && <AnalyticsContentSkeleton />}

      {!isError && !showSkeleton && data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Messages" value={messagesTotal} icon={MessageSquare} color="#3b82f6" subtitle="cette période" trend={trend(messagesTotal, data.comparison.messages)} />
            <StatCard title="Appels" value={data.calls.total} icon={Phone} color="#8b5cf6" subtitle="cette période" trend={trend(data.calls.total, data.comparison.calls)} />
            <StatCard title="Stories" value={data.stories.total} icon={Smile} color="#f59e0b" subtitle="cette période" trend={trend(data.stories.total, data.comparison.statuses)} />
            <StatCard title="Nouveaux utilisateurs" value={data.users.newUsers} icon={UserPlus} color="#22c55e" subtitle="cette période" trend={trend(data.users.newUsers, data.comparison.registrations)} />
          </div>

          <SectionTitle>Messagerie</SectionTitle>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <PieChart data={messageTypePie} title="Messages par type" />
            <div className="lg:col-span-2">
              <AreaChart data={data.messagesByDay} title="Messages par jour" color="#3b82f6" />
            </div>
          </div>
          <HeatmapChart data={data.heatmap} title="Heures de pointe (messages)" />

          <SectionTitle>Appels</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Taux de réussite" value={`${data.calls.successRate}%`} icon={CheckCircle2} color="#22c55e" subtitle={`${data.calls.answered.toLocaleString()} répondus`} />
            <StatCard title="Durée moyenne" value={formatDuration(data.calls.avgDuration)} icon={Clock} color="#8b5cf6" subtitle="par appel répondu" />
            <StatCard title="Appels manqués" value={data.calls.missed} icon={Phone} color="#ef4444" subtitle="non répondus" />
            <StatCard title="Renvoyés au répondeur" value={data.calls.voicemail + data.calls.voicemailAfterRing} icon={Voicemail} color="#0ea5e9" subtitle={`dont ${data.calls.voicemailAfterRing.toLocaleString()} après sonnerie`} />
            <StatCard title="Durée totale" value={formatDuration(data.calls.totalDuration)} icon={Clock} color="#6366f1" subtitle="cumulée" />
            <StatCard
              title="Taux TURN"
              value={`${data.calls.relayRate}%`}
              icon={Radio}
              color="#f97316"
              subtitle={`${data.calls.relay.toLocaleString()} relay / ${data.calls.p2p.toLocaleString()} P2P`}
            />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
            <PieChart data={callTypePie} title="Audio vs Vidéo" />
            <PieChart data={callOutcomePie} title="Issue des appels" />
            <PieChart data={callConnectionModePie} title="Mode de connexion" />
            <PieChart data={meetingPie} title="Réunions — réponses aux invitations" />
          </div>
          <StackedBarChart
            data={data.callsByDay}
            title="Appels par jour (audio / vidéo)"
            xKey="date"
            formatX={formatDay}
            series={[
              { key: "audio", label: "Audio", color: "#8b5cf6" },
              { key: "video", label: "Vidéo", color: "#6366f1" },
            ]}
          />

          <SectionTitle>Stories</SectionTitle>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="grid grid-cols-2 gap-4 lg:col-span-2 content-start">
              <StatCard title="Stories publiées" value={data.stories.total} icon={Smile} color="#f59e0b" subtitle="cette période" />
              <StatCard title="Vues totales" value={data.stories.totalViews} icon={Eye} color="#3b82f6" subtitle={`${data.stories.avgViews} en moyenne`} />
              <StatCard title="Likes totaux" value={data.stories.totalLikes} icon={Heart} color="#ef4444" subtitle="cette période" />
              <StatCard title="Engagement" value={`${data.stories.engagementRate}%`} icon={Heart} color="#22c55e" subtitle="likes / vues" />
            </div>
            <PieChart data={storyTypePie} title="Stories par type" />
          </div>

          <SectionTitle>Réunions</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Réunions" value={data.meetings.total} icon={Video} color="#6366f1" subtitle={`${data.meetings.ended.toLocaleString()} terminées`} />
            <StatCard title="Durée réelle moyenne" value={formatDuration(data.meetings.avgRealDuration)} icon={Clock} color="#8b5cf6" subtitle={`${formatMinutes(data.meetings.avgPlannedMinutes)} planifiées`} />
            <StatCard title="Taux de présence" value={`${data.meetings.attendanceRate}%`} icon={CheckCircle2} color="#22c55e" subtitle={`${data.meetings.attendees.toLocaleString()} présents sur ${data.meetings.participants.toLocaleString()}`} />
            <StatCard title="Taux de participation" value={`${data.meetings.joinRate}%`} icon={UsersRound} color="#ef4444" subtitle={`${data.meetings.invitedNeverJoined.toLocaleString()} invités jamais venus`} />
          </div>

          <SectionTitle>Utilisateurs &amp; conversations</SectionTitle>
          {/*
            Deux camemberts d'appareils, et ce n'est pas un doublon :
            « Connexions » compte des authentifications sur la période — un
            utilisateur fidèle n'y apparaît qu'une fois, puisque l'application
            renouvelle son jeton au lieu de se reconnecter. « Parc » compte les
            appareils qui se sont manifestés. C'est le second qui dit combien de
            monde utilise Alanya.
          */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <PieChart data={rolePie} title="Répartition par rôle" />
            <PieChart data={devicePie} title="Connexions par système" />
            <PieChart data={parcPie} title="Parc d'appareils actifs" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Conversations" value={data.conversations.total} icon={MessageSquare} color="#3b82f6" subtitle="total" />
            <StatCard title="Groupes" value={data.conversations.groups} icon={UsersRound} color="#f59e0b" subtitle="actifs" />
            <StatCard title="Privées (1-1)" value={data.conversations.oneToOne} icon={Users} color="#6366f1" subtitle="total" />
            <StatCard title="Taille moy. groupe" value={data.conversations.avgGroupSize} icon={UsersRound} color="#22c55e" subtitle="membres" />
          </div>
        </>
      )}

      <ExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        kind="analytics"
        filterParams={exportFilterParams}
      />
    </div>
  );
}
