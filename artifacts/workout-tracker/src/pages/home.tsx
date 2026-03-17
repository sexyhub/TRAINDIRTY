import {
  useGetWorkoutPlans,
  useGetStatsOverview,
  useGetActiveSession,
  useCreateSession,
  useGetSessions,
  getGetActiveSessionQueryKey,
} from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay } from "date-fns";
import { Dumbbell, ArrowRight, Play, CheckCircle2, Activity, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/components/layout";
import { useState } from "react";

export default function Home() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: plans = [] } = useGetWorkoutPlans();
  const { data: stats, isLoading: statsLoading } = useGetStatsOverview();
  const { data: activeSessionData } = useGetActiveSession();
  const { data: sessions = [] } = useGetSessions({ limit: 200 });

  const createSession = useCreateSession({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetActiveSessionQueryKey() });
        setLocation("/log");
      },
    },
  });

  const today = new Date();
  const dayOfWeek = today.getDay();
  const todayStr = today.toISOString().slice(0, 10);

  const todaysPlan = plans.find((p) => p.dayOfWeek === dayOfWeek);
  const activeSession = activeSessionData?.session;

  const todayCompletedSession = todaysPlan
    ? sessions.find((s: any) => {
        const sDate = new Date(s.startedAt).toISOString().slice(0, 10);
        return s.planId === todaysPlan.id && s.status === "completed" && sDate === todayStr;
      })
    : null;

  const isCompletedToday = !!todayCompletedSession;

  const handleStartWorkout = () => {
    if (activeSession) {
      setLocation("/log");
      return;
    }
    if (todaysPlan && !isCompletedToday) {
      createSession.mutate({ data: { planId: todaysPlan.id } });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 pt-12 space-y-8 pb-24"
    >
      <header>
        <p className="text-muted-foreground text-sm font-medium tracking-widest uppercase mb-1">
          {format(today, "EEEE, MMM do")}
        </p>
        <h1 className="text-4xl font-display font-black tracking-tight">
          TRAIN <span className="text-muted-foreground">DIRTY</span>
        </h1>
      </header>

      {/* Primary Action Card */}
      <section>
        {activeSession ? (
          <div className="bg-primary text-primary-foreground rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="font-display font-bold text-sm tracking-widest">WORKOUT IN PROGRESS</span>
              </div>
              <h2 className="text-2xl font-bold mb-6">{activeSession.planName}</h2>
              <button
                onClick={() => setLocation("/log")}
                className="bg-black text-white px-6 py-3 rounded-xl font-bold w-full flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                RESUME SESSION <ArrowRight className="w-5 h-5" />
              </button>
            </div>
            <Dumbbell className="absolute -bottom-6 -right-6 w-40 h-40 opacity-10 -rotate-12" />
          </div>
        ) : todaysPlan ? (
          isCompletedToday ? (
            <div className="bg-card border border-primary/30 rounded-2xl p-6 relative overflow-hidden">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                <span className="text-xs font-black tracking-widest text-primary uppercase">Completed Today</span>
              </div>
              <h2 className="text-2xl font-bold font-display mb-1">{todaysPlan.name}</h2>
              {todayCompletedSession?.completedAt && (
                <p className="text-xs text-muted-foreground mb-5">
                  Finished at {format(new Date(todayCompletedSession.completedAt), "h:mm a")}
                  {todayCompletedSession.totalVolume
                    ? ` · ${todayCompletedSession.totalVolume.toLocaleString()} kg volume`
                    : ""}
                </p>
              )}
              <div className="w-full py-3 rounded-xl bg-primary/10 text-primary font-bold flex items-center justify-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4" /> WORKOUT DONE — GREAT JOB!
              </div>
              <Dumbbell className="absolute -bottom-6 -right-6 w-40 h-40 opacity-5 -rotate-12" />
            </div>
          ) : (
            <div className="bg-card border border-border rounded-2xl p-6 relative overflow-hidden">
              <h3 className="text-muted-foreground text-xs font-display tracking-widest mb-1">TODAY'S PLAN</h3>
              <h2 className="text-2xl font-bold font-display mb-2">{todaysPlan.name}</h2>
              {todaysPlan.notes && (
                <p className="text-sm text-muted-foreground mb-6 line-clamp-2">{todaysPlan.notes}</p>
              )}
              <button
                onClick={handleStartWorkout}
                disabled={createSession.isPending}
                className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold w-full flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50"
              >
                {createSession.isPending ? "STARTING..." : "START WORKOUT"}
                <Play className="w-5 h-5 fill-current" />
              </button>
            </div>
          )
        ) : (
          <div className="bg-card border border-dashed border-border rounded-2xl p-8 text-center flex flex-col items-center">
            <CheckCircle2 className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="font-display text-xl font-bold mb-2">REST DAY</h3>
            <p className="text-muted-foreground text-sm mb-6">
              No workout planned for today. Recover and rebuild.
            </p>
            <Link
              href="/log"
              className="text-primary font-bold text-sm uppercase tracking-widest border-b border-primary pb-1"
            >
              Browse Plans
            </Link>
          </div>
        )}
      </section>

      {/* Weekly Overview */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold tracking-widest text-sm">WEEKLY OVERVIEW</h3>
          <Link href="/stats" className="text-muted-foreground hover:text-primary transition-colors">
            <Activity className="w-5 h-5" />
          </Link>
        </div>

        {statsLoading ? (
          <div className="grid grid-cols-2 gap-4">
            <div className="h-24 bg-card rounded-2xl animate-pulse" />
            <div className="h-24 bg-card rounded-2xl animate-pulse" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card border border-border p-4 rounded-2xl">
              <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Volume</p>
              <p className="text-2xl font-display font-bold">
                {stats?.weeklyVolume.toLocaleString()}{" "}
                <span className="text-sm text-muted-foreground">kg</span>
              </p>
            </div>
            <div className="bg-card border border-border p-4 rounded-2xl">
              <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Workouts</p>
              <p className="text-2xl font-display font-bold">{stats?.totalWorkouts}</p>
            </div>
          </div>
        )}
      </section>

      {/* Workout History Calendar Strip */}
      <HistoryStrip sessions={sessions} />
    </motion.div>
  );
}

// ── History Calendar Strip ─────────────────────────────────────────────────────
function formatDuration(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function HistoryStrip({ sessions }: { sessions: any[] }) {
  const today = new Date();
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date>(today);

  const weekStart = startOfWeek(addWeeks(today, weekOffset), { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getSessionsForDate = (date: Date) =>
    sessions.filter((s: any) => {
      const sd = new Date(s.startedAt);
      return isSameDay(sd, date) && (s.status === "completed" || s.status === "aborted");
    });

  const hasWorkout = (date: Date) =>
    sessions.some((s: any) => {
      const sd = new Date(s.startedAt);
      return isSameDay(sd, date) && s.status === "completed";
    });

  const selectedSessions = getSessionsForDate(selectedDate);
  const isCurrentWeek = weekOffset === 0;
  const isFutureWeek = weekOffset > 0;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-bold tracking-widest text-sm">HISTORY</h3>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setWeekOffset((w) => w - 1)}
            className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setWeekOffset(0); setSelectedDate(today); }}
            className={cn(
              "px-2.5 h-7 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors",
              weekOffset === 0 ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
            )}
          >
            This Week
          </button>
          <button
            onClick={() => !isFutureWeek && setWeekOffset((w) => w + 1)}
            disabled={isFutureWeek}
            className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Week strip */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <p className="text-[10px] font-bold text-muted-foreground text-center mb-3">
          {format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d, yyyy")}
        </p>
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((day) => {
            const isToday = isSameDay(day, today);
            const isSelected = isSameDay(day, selectedDate);
            const worked = hasWorkout(day);
            const isFuture = day > today;

            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                disabled={isFuture}
                className={cn(
                  "flex flex-col items-center gap-1.5 py-2.5 rounded-xl transition-all",
                  isSelected && "bg-primary",
                  !isSelected && isToday && "bg-primary/10 border border-primary/30",
                  !isSelected && !isToday && !isFuture && "hover:bg-secondary/60",
                  isFuture && "opacity-20"
                )}
              >
                <span
                  className={cn(
                    "text-[9px] font-black uppercase tracking-wider",
                    isSelected ? "text-primary-foreground" : isToday ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {format(day, "EEE")[0]}
                </span>
                <span
                  className={cn(
                    "text-sm font-bold tabular-nums",
                    isSelected ? "text-primary-foreground" : isToday ? "text-primary" : "text-foreground"
                  )}
                >
                  {format(day, "d")}
                </span>
                <div
                  className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    worked && isSelected && "bg-primary-foreground",
                    worked && !isSelected && "bg-primary",
                    !worked && "bg-transparent"
                  )}
                />
              </button>
            );
          })}
        </div>

        {/* Selected day details */}
        <div className="mt-4 pt-4 border-t border-border/40">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">
            {isSameDay(selectedDate, today) ? "Today" : format(selectedDate, "EEEE, MMM d")}
          </p>

          {selectedSessions.length === 0 ? (
            <p className="text-xs text-muted-foreground/50 italic">
              {selectedDate > today ? "Future day" : "No workout recorded"}
            </p>
          ) : (
            <div className="space-y-2">
              {selectedSessions.map((s: any) => {
                const start = new Date(s.startedAt);
                const end = s.completedAt ? new Date(s.completedAt) : null;
                const durationMs = end ? end.getTime() - start.getTime() : null;
                const isCompleted = s.status === "completed";
                return (
                  <div key={s.id} className="flex items-center gap-3">
                    <div className={cn("w-2 h-2 rounded-full shrink-0", isCompleted ? "bg-primary" : "bg-muted-foreground/30")} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{s.planName}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-[10px] text-muted-foreground">{format(start, "h:mm a")}</p>
                        {durationMs && durationMs > 0 && (
                          <>
                            <span className="text-[10px] text-muted-foreground/30">·</span>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />
                              {formatDuration(durationMs)}
                            </span>
                          </>
                        )}
                        {!isCompleted && (
                          <span className="text-[9px] font-bold text-muted-foreground/40 uppercase">aborted</span>
                        )}
                      </div>
                    </div>
                    {s.totalVolume && s.totalVolume > 0 && (
                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold">{s.totalVolume.toLocaleString()}</p>
                        <p className="text-[10px] text-muted-foreground">kg</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
