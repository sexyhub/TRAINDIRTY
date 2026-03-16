import { useState } from "react";
import { 
  useGetActiveSession, 
  useGetWorkoutPlans, 
  useCreateSession,
  useGetSession,
  useGetWorkoutPlan,
  useLogSet,
  useUpdateSetLog,
  useUpdateSession,
  getGetActiveSessionQueryKey,
  getGetSessionQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Play, Square, Plus, Check } from "lucide-react";
import { useGlobalTimer } from "@/lib/timer-context";
import { cn } from "@/components/layout";

export default function LogPage() {
  const { data: activeData, isLoading: sessionLoading } = useGetActiveSession();
  const session = activeData?.session;

  if (sessionLoading) {
    return <div className="p-6 pt-12 flex justify-center"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen">
      {session ? <ActiveWorkoutView session={session} /> : <SelectPlanView />}
    </motion.div>
  );
}

function SelectPlanView() {
  const queryClient = useQueryClient();
  const { data: plans = [] } = useGetWorkoutPlans();
  const createSession = useCreateSession({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetActiveSessionQueryKey() })
    }
  });

  return (
    <div className="p-6 pt-12 space-y-6">
      <h1 className="text-3xl font-display font-black tracking-tight uppercase">Start Workout</h1>
      <div className="space-y-4">
        {plans.map(plan => (
          <div key={plan.id} className="bg-card border border-border p-5 rounded-2xl flex items-center justify-between hover:border-primary/50 transition-colors">
            <div>
              <h3 className="font-bold text-lg">{plan.name}</h3>
              <p className="text-sm text-muted-foreground line-clamp-1">{plan.notes || "No description"}</p>
            </div>
            <button 
              onClick={() => createSession.mutate({ data: { planId: plan.id } })}
              disabled={createSession.isPending}
              className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-primary hover:bg-primary hover:text-primary-foreground transition-all shrink-0"
            >
              <Play className="w-5 h-5 ml-1 fill-current" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActiveWorkoutView({ session }: { session: any }) {
  const queryClient = useQueryClient();
  const { startTimer } = useGlobalTimer();
  
  const { data: fullPlan } = useGetWorkoutPlan(session.planId);
  const { data: fullSession } = useGetSession(session.id);
  
  const finishSession = useUpdateSession({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetActiveSessionQueryKey() });
      }
    }
  });

  const exercises = fullPlan?.exercises || [];
  const setLogs = fullSession?.setLogs || [];

  return (
    <div className="p-4 pt-12 space-y-8 pb-32">
      <div className="flex justify-between items-start">
        <div>
          <span className="text-primary text-xs font-bold tracking-widest flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            IN PROGRESS
          </span>
          <h1 className="text-3xl font-display font-black tracking-tight">{session.planName}</h1>
        </div>
      </div>

      <div className="space-y-8">
        {exercises.map((ex) => {
          const exLogs = setLogs.filter(l => l.exerciseId === ex.id);
          return (
            <ExerciseTracker 
              key={ex.id} 
              exercise={ex} 
              logs={exLogs} 
              sessionId={session.id}
              onSetComplete={() => startTimer(ex.restSeconds || 60)}
            />
          );
        })}
      </div>

      <button
        onClick={() => finishSession.mutate({ id: session.id, data: { status: "completed" } })}
        disabled={finishSession.isPending}
        className="fixed bottom-24 left-4 right-4 bg-primary text-primary-foreground py-4 rounded-2xl font-display font-bold text-lg flex items-center justify-center gap-2 shadow-2xl active:scale-95 transition-all"
      >
        <Square className="w-5 h-5 fill-current" /> FINISH WORKOUT
      </button>
    </div>
  );
}

function ExerciseTracker({ exercise, logs, sessionId, onSetComplete }: any) {
  const queryClient = useQueryClient();
  const logSet = useLogSet();
  const updateSetLog = useUpdateSetLog();

  const handleAddSet = () => {
    const nextSetNum = logs.length + 1;
    logSet.mutate({
      id: sessionId,
      data: {
        exerciseId: exercise.id,
        setNumber: nextSetNum,
        completed: false,
        repsCompleted: exercise.reps,
        weightUsed: exercise.weight || 0
      }
    }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey(sessionId) })
    });
  };

  const handleToggleSet = (setId: number, completed: boolean, reps: number, weight: number) => {
    updateSetLog.mutate({
      id: sessionId,
      setId: setId,
      data: { completed, repsCompleted: reps, weightUsed: weight }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey(sessionId) });
        if (completed) onSetComplete();
      }
    });
  };

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-border/50 bg-secondary/30">
        <h3 className="font-bold text-lg">{exercise.name}</h3>
        <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">
          Target: {exercise.sets} sets × {exercise.reps} reps
        </p>
      </div>
      
      <div className="p-2 space-y-2">
        <div className="grid grid-cols-[3rem_1fr_1fr_3rem] gap-2 px-2 text-xs font-bold tracking-widest text-muted-foreground mb-2 mt-2">
          <div className="text-center">SET</div>
          <div className="text-center">LBS/KG</div>
          <div className="text-center">REPS</div>
          <div className="text-center"><Check className="w-4 h-4 mx-auto" /></div>
        </div>

        {logs.map((log: any) => (
          <SetRow 
            key={log.id} 
            log={log} 
            onToggle={(c, r, w) => handleToggleSet(log.id, c, r, w)} 
          />
        ))}

        <button 
          onClick={handleAddSet}
          className="w-full py-3 mt-2 rounded-xl border border-dashed border-border text-muted-foreground text-sm font-bold flex items-center justify-center gap-2 hover:bg-secondary/50 transition-colors"
        >
          <Plus className="w-4 h-4" /> ADD SET
        </button>
      </div>
    </div>
  );
}

function SetRow({ log, onToggle }: any) {
  const [reps, setReps] = useState(log.repsCompleted || 0);
  const [weight, setWeight] = useState(log.weightUsed || 0);
  const completed = log.completed;

  const handleCheck = () => {
    onToggle(!completed, reps, weight);
  };

  return (
    <div className={cn(
      "grid grid-cols-[3rem_1fr_1fr_3rem] gap-2 items-center p-2 rounded-xl transition-colors",
      completed ? "bg-primary/5" : "bg-background"
    )}>
      <div className="text-center font-bold text-muted-foreground">{log.setNumber}</div>
      
      <input 
        type="number"
        value={weight}
        onChange={e => setWeight(Number(e.target.value))}
        className="bg-secondary text-center w-full py-2 rounded-lg font-bold focus:outline-none focus:ring-1 focus:ring-primary/50"
      />
      
      <input 
        type="number"
        value={reps}
        onChange={e => setReps(Number(e.target.value))}
        className="bg-secondary text-center w-full py-2 rounded-lg font-bold focus:outline-none focus:ring-1 focus:ring-primary/50"
      />
      
      <button 
        onClick={handleCheck}
        className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center transition-all mx-auto",
          completed ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
        )}
      >
        <Check className={cn("w-5 h-5", completed ? "opacity-100" : "opacity-30")} />
      </button>
    </div>
  );
}
