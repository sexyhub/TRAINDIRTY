import { useState, useEffect } from "react";
import { cn } from "@/components/layout";
import {
  useGetStatsOverview,
  useGetPersonalRecords,
  useGetExercises,
  useGetExerciseProgress,
  useGetSessions,
} from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { Activity, Trophy, TrendingUp, ChevronLeft, ChevronRight, Calendar, Clock, CheckCircle2, XCircle, Dumbbell } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, formatDistanceToNow } from "date-fns";

function formatDuration(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export default function StatsPage() {
  const { data: stats } = useGetStatsOverview();
  const { data: prs = [] } = useGetPersonalRecords();
  const { data: exercises = [] } = useGetExercises();
  const { data: sessions = [] } = useGetSessions({ limit: 200 });

  const [selectedEx, setSelectedEx] = useState<number | null>(null);

  useEffect(() => {
    if (exercises.length > 0 && selectedEx === null) {
      setSelectedEx(exercises[0].id);
    }
  }, [exercises, selectedEx]);

  const { data: progress = [] } = useGetExerciseProgress(selectedEx ?? 0, {
    query: { enabled: !!selectedEx },
  });

  const completedSessions = sessions.filter(
    (s: any) => s.status === "completed" && s.completedAt
  );
  const avgDurationMs =
    completedSessions.length > 0
      ? completedSessions.reduce((sum: number, s: any) => {
          return sum + (new Date(s.completedAt).getTime() - new Date(s.startedAt).getTime());
        }, 0) / completedSessions.length
      : 0;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 pt-12 space-y-8 pb-10">
      <header>
        <h1 className="text-3xl font-display font-black tracking-tight uppercase mb-6 flex items-center gap-3">
          <Activity className="w-8 h-8 text-primary" /> Metrics
        </h1>
      </header>

      {/* Overview Grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Total Workouts" value={stats?.totalWorkouts || 0} />
        <StatCard label="Total Sets" value={stats?.totalSets || 0} />
        <StatCard label="Avg/Week" value={(stats?.avgWorkoutsPerWeek || 0).toFixed(1)} />
        <StatCard label="Total Vol" value={`${(stats?.totalVolume || 0).toLocaleString()} kg`} highlight />
        {avgDurationMs > 0 && (
          <StatCard
            label="Avg Duration"
            value={formatDuration(avgDurationMs)}
            icon={<Clock className="w-3 h-3" />}
          />
        )}
      </div>

      {/* Workout Calendar */}
      <WorkoutCalendar sessions={sessions} />

      {/* Workout History */}
      <WorkoutHistory sessions={sessions} />

      {/* Progress Chart */}
      <div className="bg-card border border-border rounded-3xl p-5">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display font-bold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-muted-foreground" /> PROGRESS
          </h2>
          <select
            className="bg-secondary text-xs px-3 py-1.5 rounded-lg border-none outline-none font-bold max-w-[140px] truncate"
            value={selectedEx ?? ""}
            onChange={(e) => setSelectedEx(Number(e.target.value))}
          >
            {exercises.map((ex: any) => (
              <option key={ex.id} value={ex.id}>
                {ex.name}
              </option>
            ))}
          </select>
        </div>

        {progress.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">No data yet for this exercise</p>
        ) : (
          <div className="h-48 w-full -ml-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={progress}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                <XAxis dataKey="date" stroke="#666" fontSize={10} tickFormatter={(v) => v.substring(5, 10)} />
                <YAxis stroke="#666" fontSize={10} width={40} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#111", border: "1px solid #333", borderRadius: "8px" }}
                  itemStyle={{ color: "#fff" }}
                />
                <Line
                  type="monotone"
                  dataKey="maxWeight"
                  stroke="#fff"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "#000", stroke: "#fff", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Personal Records */}
      <div className="space-y-4">
        <h2 className="font-display font-bold flex items-center gap-2 tracking-widest text-sm">
          <Trophy className="w-4 h-4 text-muted-foreground" /> PERSONAL RECORDS
        </h2>
        <div className="space-y-3">
          {prs.slice(0, 5).map((pr: any) => (
            <div key={pr.exerciseId} className="flex items-center justify-between p-4 bg-card border border-border rounded-2xl">
              <div>
                <p className="font-bold">{pr.exerciseName}</p>
                <p className="text-xs text-muted-foreground uppercase">{pr.category}</p>
              </div>
              <div className="text-right">
                <p className="font-display font-bold text-xl">
                  {pr.maxWeight} <span className="text-sm text-muted-foreground">kg</span>
                </p>
                <p className="text-xs text-muted-foreground">{pr.maxReps} Reps</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ── Workout History ────────────────────────────────────────────────────────────
function WorkoutHistory({ sessions }: { sessions: any[] }) {
  const [showAll, setShowAll] = useState(false);

  const sorted = [...sessions]
    .filter((s: any) => s.status === "completed" || s.status === "aborted")
    .sort((a: any, b: any) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

  const visible = showAll ? sorted : sorted.slice(0, 5);

  if (sorted.length === 0) {
    return (
      <div className="bg-card border border-border rounded-3xl p-5">
        <h2 className="font-display font-bold flex items-center gap-2 tracking-widest text-sm mb-4">
          <Dumbbell className="w-4 h-4 text-muted-foreground" /> WORKOUT HISTORY
        </h2>
        <p className="text-xs text-muted-foreground text-center py-6">No completed workouts yet</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-3xl p-5 space-y-4">
      <h2 className="font-display font-bold flex items-center gap-2 tracking-widest text-sm">
        <Dumbbell className="w-4 h-4 text-muted-foreground" /> WORKOUT HISTORY
      </h2>

      <div className="space-y-2">
        {visible.map((session: any) => {
          const start = new Date(session.startedAt);
          const end = session.completedAt ? new Date(session.completedAt) : null;
          const durationMs = end ? end.getTime() - start.getTime() : null;
          const isCompleted = session.status === "completed";

          return (
            <div
              key={session.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-2xl border transition-all",
                isCompleted ? "bg-background/60 border-border/60" : "bg-secondary/30 border-border/30 opacity-60"
              )}
            >
              <div
                className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                  isCompleted ? "bg-primary/15" : "bg-secondary"
                )}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                ) : (
                  <XCircle className="w-4 h-4 text-muted-foreground/50" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{session.planName}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-[10px] text-muted-foreground">
                    {format(start, "EEE, MMM d")}
                  </p>
                  {durationMs && durationMs > 0 && (
                    <>
                      <span className="text-[10px] text-muted-foreground/40">·</span>
                      <p className="text-[10px] text-muted-foreground">
                        {formatDuration(durationMs)}
                      </p>
                    </>
                  )}
                  {!isCompleted && (
                    <span className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-wider">Aborted</span>
                  )}
                </div>
              </div>

              <div className="text-right shrink-0">
                {session.totalVolume && session.totalVolume > 0 ? (
                  <>
                    <p className="text-sm font-bold tabular-nums">{session.totalVolume.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">kg vol</p>
                  </>
                ) : (
                  <p className="text-[10px] text-muted-foreground/40">
                    {formatDistanceToNow(start, { addSuffix: true })}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {sorted.length > 5 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full py-2.5 rounded-xl bg-secondary text-muted-foreground text-xs font-bold hover:text-foreground transition-colors"
        >
          {showAll ? "Show Less" : `Show All ${sorted.length} Workouts`}
        </button>
      )}
    </div>
  );
}

// ── Workout Calendar ───────────────────────────────────────────────────────────
function WorkoutCalendar({ sessions }: { sessions: any[] }) {
  const [viewDate, setViewDate] = useState(() => new Date());

  const workoutDates = new Set(
    sessions
      .filter((s: any) => s.status === "completed")
      .map((s: any) => {
        const d = new Date(s.startedAt);
        return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
      })
  );

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${pad2(today.getMonth() + 1)}-${pad2(today.getDate())}`;

  const monthName = viewDate.toLocaleString("default", { month: "long", year: "numeric" });

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="bg-card border border-border rounded-3xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-bold flex items-center gap-2 text-sm tracking-widest">
          <Calendar className="w-4 h-4 text-muted-foreground" /> CALENDAR
        </h2>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold w-28 text-center">{monthName}</span>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i} className="text-center text-[10px] font-black text-muted-foreground py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const dateStr = `${year}-${pad2(month + 1)}-${pad2(day)}`;
          const isWorkout = workoutDates.has(dateStr);
          const isToday = dateStr === todayStr;
          return (
            <div
              key={i}
              className={cn(
                "aspect-square flex items-center justify-center rounded-lg text-xs font-bold transition-colors",
                isWorkout && "bg-primary text-primary-foreground",
                !isWorkout && isToday && "border border-primary/50 text-primary",
                !isWorkout && !isToday && "text-muted-foreground"
              )}
            >
              {day}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border/40">
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <div className="w-2.5 h-2.5 rounded-sm bg-primary" /> Workout
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <div className="w-2.5 h-2.5 rounded-sm border border-primary/50" /> Today
        </div>
        <span className="ml-auto text-[10px] text-muted-foreground">
          {workoutDates.size} sessions tracked
        </span>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight = false,
  icon,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "p-4 rounded-2xl border flex flex-col justify-center",
        highlight ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"
      )}
    >
      <p className={cn("text-xs tracking-wider mb-1 uppercase flex items-center gap-1", highlight ? "text-primary-foreground/70" : "text-muted-foreground")}>
        {icon}{label}
      </p>
      <p className="text-3xl font-display font-bold">{value}</p>
    </div>
  );
}
