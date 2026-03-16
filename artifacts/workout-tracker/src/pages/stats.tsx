import { useState } from "react";
import { 
  useGetStatsOverview, 
  useGetPersonalRecords,
  useGetExercises,
  useGetExerciseProgress
} from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { Activity, Trophy, TrendingUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function StatsPage() {
  const { data: stats } = useGetStatsOverview();
  const { data: prs = [] } = useGetPersonalRecords();
  const { data: exercises = [] } = useGetExercises();
  
  const [selectedEx, setSelectedEx] = useState<number>(exercises[0]?.id || 1);
  const { data: progress = [] } = useGetExerciseProgress(selectedEx, { query: { enabled: !!selectedEx }});

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
      </div>

      {/* Progress Chart */}
      <div className="bg-card border border-border rounded-3xl p-5">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display font-bold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-muted-foreground" /> PROGRESS
          </h2>
          <select 
            className="bg-secondary text-xs px-3 py-1.5 rounded-lg border-none outline-none font-bold"
            value={selectedEx}
            onChange={(e) => setSelectedEx(Number(e.target.value))}
          >
            {exercises.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
          </select>
        </div>
        
        <div className="h-48 w-full -ml-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={progress}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
              <XAxis dataKey="date" stroke="#666" fontSize={10} tickFormatter={(v) => v.substring(5,10)} />
              <YAxis stroke="#666" fontSize={10} width={40} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px' }}
                itemStyle={{ color: '#fff' }}
              />
              <Line type="monotone" dataKey="maxWeight" stroke="#fff" strokeWidth={3} dot={{ r: 4, fill: '#000', stroke: '#fff', strokeWidth: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Personal Records */}
      <div className="space-y-4">
        <h2 className="font-display font-bold flex items-center gap-2 tracking-widest text-sm">
          <Trophy className="w-4 h-4 text-muted-foreground" /> PERSONAL RECORDS
        </h2>
        <div className="space-y-3">
          {prs.slice(0, 5).map(pr => (
            <div key={pr.exerciseId} className="flex items-center justify-between p-4 bg-card border border-border rounded-2xl">
              <div>
                <p className="font-bold">{pr.exerciseName}</p>
                <p className="text-xs text-muted-foreground uppercase">{pr.category}</p>
              </div>
              <div className="text-right">
                <p className="font-display font-bold text-xl">{pr.maxWeight} <span className="text-sm text-muted-foreground">kg</span></p>
                <p className="text-xs text-muted-foreground">{pr.maxReps} Reps</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function StatCard({ label, value, highlight = false }: { label: string, value: string | number, highlight?: boolean }) {
  return (
    <div className={cn(
      "p-4 rounded-2xl border flex flex-col justify-center",
      highlight ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"
    )}>
      <p className={cn("text-xs tracking-wider mb-1 uppercase", highlight ? "text-primary-foreground/70" : "text-muted-foreground")}>{label}</p>
      <p className="text-3xl font-display font-bold">{value}</p>
    </div>
  );
}
