import { useGetWorkoutPlans, useGetStatsOverview, useGetActiveSession, useCreateSession, getGetActiveSessionQueryKey } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { Dumbbell, ArrowRight, Play, CheckCircle2, Activity } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function Home() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: plans = [], isLoading: plansLoading } = useGetWorkoutPlans();
  const { data: stats, isLoading: statsLoading } = useGetStatsOverview();
  const { data: activeSessionData } = useGetActiveSession();
  
  const createSession = useCreateSession({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetActiveSessionQueryKey() });
        setLocation("/log");
      }
    }
  });

  const today = new Date();
  const dayOfWeek = today.getDay();
  const todaysPlan = plans.find(p => p.dayOfWeek === dayOfWeek);
  
  const activeSession = activeSessionData?.session;

  const handleStartWorkout = () => {
    if (activeSession) {
      setLocation("/log");
      return;
    }
    if (todaysPlan) {
      createSession.mutate({ data: { planId: todaysPlan.id } });
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 pt-12 space-y-8"
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
          <div className="bg-card border border-border rounded-2xl p-6 relative overflow-hidden">
            <h3 className="text-muted-foreground text-xs font-display tracking-widest mb-1">TODAY'S PLAN</h3>
            <h2 className="text-2xl font-bold font-display mb-2">{todaysPlan.name}</h2>
            {todaysPlan.notes && <p className="text-sm text-muted-foreground mb-6 line-clamp-2">{todaysPlan.notes}</p>}
            
            <button 
              onClick={handleStartWorkout}
              disabled={createSession.isPending}
              className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold w-full flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50"
            >
              {createSession.isPending ? "STARTING..." : "START WORKOUT"} 
              <Play className="w-5 h-5 fill-current" />
            </button>
          </div>
        ) : (
          <div className="bg-card border border-dashed border-border rounded-2xl p-8 text-center flex flex-col items-center">
            <CheckCircle2 className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="font-display text-xl font-bold mb-2">REST DAY</h3>
            <p className="text-muted-foreground text-sm mb-6">No workout planned for today. Recover and rebuild.</p>
            <Link href="/log" className="text-primary font-bold text-sm uppercase tracking-widest border-b border-primary pb-1">
              Browse Plans
            </Link>
          </div>
        )}
      </section>

      {/* Stats Quick View */}
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
              <p className="text-2xl font-display font-bold">{stats?.weeklyVolume.toLocaleString()} <span className="text-sm text-muted-foreground">kg</span></p>
            </div>
            <div className="bg-card border border-border p-4 rounded-2xl">
              <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Workouts</p>
              <p className="text-2xl font-display font-bold">{stats?.totalWorkouts}</p>
            </div>
          </div>
        )}
      </section>
    </motion.div>
  );
}
