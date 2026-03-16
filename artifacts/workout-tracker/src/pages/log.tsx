import { useState, useCallback, useEffect, useRef } from "react";
import {
  useGetActiveSession,
  useGetWorkoutPlans,
  useCreateSession,
  useGetSession,
  useGetWorkoutPlan,
  useLogSet,
  useUpdateSetLog,
  useUpdateSession,
  useCreateWorkoutPlan,
  useCreateExercise,
  useDeleteWorkoutPlan,
  useDeleteExercise,
  getGetActiveSessionQueryKey,
  getGetSessionQueryKey,
  getGetWorkoutPlansQueryKey,
  getGetWorkoutPlanQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Square, Plus, Check, ChevronDown, ChevronUp, Trash2, X, Edit2, Dumbbell, Video } from "lucide-react";
import { useGlobalTimer } from "@/lib/timer-context";
import { cn } from "@/components/layout";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const CATEGORIES = ["Chest", "Back", "Legs", "Shoulders", "Arms", "Core", "Cardio"] as const;

// ── YouTube helpers ────────────────────────────────────────────────────────────
function toYouTubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    let videoId: string | null = null;
    if (u.hostname.includes("youtu.be")) {
      videoId = u.pathname.slice(1).split("?")[0];
    } else if (u.hostname.includes("youtube.com")) {
      videoId = u.searchParams.get("v");
      if (!videoId) {
        const parts = u.pathname.split("/");
        const embedIdx = parts.indexOf("embed");
        if (embedIdx !== -1) videoId = parts[embedIdx + 1];
      }
    }
    return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0` : null;
  } catch {
    return null;
  }
}

function VideoModal({ url, onClose }: { url: string; onClose: () => void }) {
  const embedUrl = toYouTubeEmbedUrl(url);
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.92, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className="w-full max-w-sm bg-card rounded-3xl overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
            <p className="font-bold text-sm tracking-wide">Tutorial Video</p>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
            {embedUrl ? (
              <iframe
                className="absolute inset-0 w-full h-full"
                src={embedUrl}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="Tutorial video"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-secondary">
                <Video className="w-8 h-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Can't embed this URL</p>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary text-sm font-bold underline"
                >
                  Open in browser
                </a>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function LogPage() {
  const { data: activeData, isLoading } = useGetActiveSession();
  const session = activeData?.session;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen">
      {session ? <ActiveWorkoutView session={session} /> : <PlansView />}
    </motion.div>
  );
}

// ── Plans view (no active session) ────────────────────────────────────────────
function PlansView() {
  const queryClient = useQueryClient();
  const { data: plans = [] } = useGetWorkoutPlans();
  const createSession = useCreateSession({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetActiveSessionQueryKey() }),
    },
  });

  const [showNewPlan, setShowNewPlan] = useState(false);
  const [expandedPlan, setExpandedPlan] = useState<number | null>(null);

  return (
    <div className="p-5 pt-12 pb-32 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-display font-black tracking-tight uppercase">Workouts</h1>
        <button
          onClick={() => setShowNewPlan(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-bold"
        >
          <Plus className="w-4 h-4" /> New Plan
        </button>
      </div>

      {plans.length === 0 && !showNewPlan && (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
          <Dumbbell className="w-12 h-12 text-muted-foreground/30" />
          <p className="text-muted-foreground text-sm">No workout plans yet.<br />Create one to get started.</p>
        </div>
      )}

      <AnimatePresence>
        {showNewPlan && (
          <NewPlanForm onClose={() => setShowNewPlan(false)} />
        )}
      </AnimatePresence>

      <div className="space-y-3">
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            expanded={expandedPlan === plan.id}
            onToggleExpand={() => setExpandedPlan(expandedPlan === plan.id ? null : plan.id)}
            onStart={() => createSession.mutate({ data: { planId: plan.id } })}
            isStarting={createSession.isPending}
          />
        ))}
      </div>
    </div>
  );
}

// ── New plan form ─────────────────────────────────────────────────────────────
function NewPlanForm({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const createPlan = useCreateWorkoutPlan({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetWorkoutPlansQueryKey() });
        onClose();
      },
    },
  });

  const [name, setName] = useState("");
  const [day, setDay] = useState(new Date().getDay());
  const [notes, setNotes] = useState("");

  const submit = () => {
    if (!name.trim()) return;
    createPlan.mutate({ data: { name: name.trim(), dayOfWeek: day, notes: notes.trim() || null } });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="bg-card border border-border rounded-2xl p-5 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-lg">New Plan</h2>
        <button onClick={onClose} className="text-muted-foreground">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-3">
        <input
          type="text"
          placeholder="Plan name (e.g. Push Day)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground/50"
          autoFocus
        />

        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold mb-2">Day</p>
          <div className="grid grid-cols-7 gap-1">
            {DAYS.map((d, i) => (
              <button
                key={d}
                onClick={() => setDay(i)}
                className={cn(
                  "py-2 rounded-lg text-xs font-bold transition-colors",
                  day === i ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                )}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <textarea
          placeholder="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground/50"
        />
      </div>

      <button
        onClick={submit}
        disabled={!name.trim() || createPlan.isPending}
        className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold text-sm disabled:opacity-40 transition-opacity"
      >
        {createPlan.isPending ? "Creating..." : "Create Plan"}
      </button>
    </motion.div>
  );
}

// ── Plan card (expandable) ────────────────────────────────────────────────────
function PlanCard({
  plan,
  expanded,
  onToggleExpand,
  onStart,
  isStarting,
}: {
  plan: any;
  expanded: boolean;
  onToggleExpand: () => void;
  onStart: () => void;
  isStarting: boolean;
}) {
  const queryClient = useQueryClient();
  const deletePlan = useDeleteWorkoutPlan({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetWorkoutPlansQueryKey() }),
    },
  });
  const { data: planDetail } = useGetWorkoutPlan(plan.id, { query: { enabled: expanded } });
  const exercises = planDetail?.exercises ?? [];

  const [showAddEx, setShowAddEx] = useState(false);

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Header row */}
      <div className="p-4 flex items-center gap-3">
        <button onClick={onToggleExpand} className="flex-1 flex items-center gap-3 text-left">
          <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
            <span className="text-xs font-black text-muted-foreground">{DAYS[plan.dayOfWeek]}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-base truncate">{plan.name}</h3>
            <p className="text-xs text-muted-foreground">
              {exercises.length > 0
                ? `${exercises.length} exercise${exercises.length !== 1 ? "s" : ""}`
                : expanded
                ? "No exercises yet"
                : "Tap to expand"}
            </p>
          </div>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
          )}
        </button>

        {/* Start button */}
        <button
          onClick={(e) => { e.stopPropagation(); onStart(); }}
          disabled={isStarting}
          className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0"
        >
          <Play className="w-4 h-4 fill-current ml-0.5" />
        </button>
      </div>

      {/* Expanded exercise list */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border/50 px-4 py-3 space-y-2">
              {exercises.map((ex: any) => (
                <ExerciseRow key={ex.id} exercise={ex} planId={plan.id} />
              ))}

              {showAddEx ? (
                <NewExerciseForm
                  planId={plan.id}
                  onClose={() => setShowAddEx(false)}
                />
              ) : (
                <button
                  onClick={() => setShowAddEx(true)}
                  className="w-full py-3 rounded-xl border border-dashed border-border/60 text-muted-foreground text-xs font-bold flex items-center justify-center gap-2 hover:border-primary/40 hover:text-foreground transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> ADD EXERCISE
                </button>
              )}
            </div>

            {/* Delete plan */}
            <div className="px-4 pb-4">
              <button
                onClick={() => {
                  if (confirm(`Delete "${plan.name}"? This cannot be undone.`)) {
                    deletePlan.mutate({ id: plan.id });
                  }
                }}
                className="text-xs text-muted-foreground/50 flex items-center gap-1.5 hover:text-destructive transition-colors"
              >
                <Trash2 className="w-3 h-3" /> Delete plan
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Exercise row inside a plan ─────────────────────────────────────────────────
function ExerciseRow({ exercise, planId }: { exercise: any; planId: number }) {
  const queryClient = useQueryClient();
  const [videoOpen, setVideoOpen] = useState(false);
  const deleteExercise = useDeleteExercise({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetWorkoutPlanQueryKey(planId) });
      },
    },
  });

  return (
    <>
      {videoOpen && exercise.videoUrl && (
        <VideoModal url={exercise.videoUrl} onClose={() => setVideoOpen(false)} />
      )}
      <div className="py-2 px-1 border-b border-border/20 last:border-0 space-y-1">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{exercise.name}</p>
            <p className="text-xs text-muted-foreground">
              {exercise.sets}×{exercise.reps}
              {exercise.weight ? ` · ${exercise.weight}kg` : ""}
            </p>
          </div>
          {exercise.videoUrl && (
            <button
              onClick={() => setVideoOpen(true)}
              className="bg-primary/15 hover:bg-primary/25 text-primary border border-primary/30 transition-colors p-2 -m-1 rounded-lg touch-manipulation flex items-center justify-center min-w-[44px] min-h-[44px]"
              title="Watch video"
            >
              <Video className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => deleteExercise.mutate({ id: exercise.id })}
            className="text-muted-foreground/30 hover:text-destructive transition-colors p-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
        {(exercise.tags?.length > 0 || exercise.description) && (
          <div className="flex flex-wrap items-center gap-1 pl-0.5">
            {exercise.tags?.map((tag) => (
              <span key={tag} className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary/80">
                {tag}
              </span>
            ))}
            {exercise.description && (
              <span className="text-[10px] text-muted-foreground/60 truncate max-w-[180px]">{exercise.description}</span>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// ── Add exercise form ─────────────────────────────────────────────────────────
function NewExerciseForm({ planId, onClose }: { planId: number; onClose: () => void }) {
  const queryClient = useQueryClient();
  const createEx = useCreateExercise({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetWorkoutPlanQueryKey(planId) });
        onClose();
      },
    },
  });

  const [name, setName] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState(10);
  const [weight, setWeight] = useState("");
  const [rest, setRest] = useState(60);

  const toggleTag = (cat: string) => {
    setTags((prev) =>
      prev.includes(cat) ? prev.filter((t) => t !== cat) : [...prev, cat]
    );
  };

  const submit = () => {
    if (!name.trim()) return;
    const primaryCategory = (tags[0] ?? "Chest") as typeof CATEGORIES[number];
    createEx.mutate({
      data: {
        planId,
        name: name.trim(),
        category: primaryCategory,
        tags,
        description: description.trim() || null,
        videoUrl: videoUrl.trim() || null,
        sets,
        reps,
        weight: weight ? Number(weight) : null,
        restSeconds: rest,
        groupType: "none",
        sortOrder: 0,
      },
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-background border border-border/60 rounded-xl p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-black tracking-widest text-muted-foreground uppercase">New Exercise</p>
        <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
      </div>

      {/* Name */}
      <input
        type="text"
        placeholder="Exercise name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoFocus
        className="w-full bg-card border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground/40"
      />

      {/* Multi-tag picker */}
      <div>
        <p className="text-[10px] text-muted-foreground font-bold uppercase mb-1.5">Muscle Groups <span className="text-muted-foreground/40 normal-case font-normal">(select all that apply)</span></p>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => toggleTag(cat)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-bold transition-colors",
                tags.includes(cat)
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <textarea
        placeholder="Description (optional) — cues, form notes…"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2}
        className="w-full bg-card border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground/40 resize-none"
      />

      {/* Video URL */}
      <div className="relative">
        <Video className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40" />
        <input
          type="url"
          placeholder="Video URL (optional) — YouTube, etc."
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          className="w-full bg-card border border-border rounded-lg pl-8 pr-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground/40"
        />
      </div>

      {/* Sets / Reps / Weight / Rest */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Sets", value: sets, onChange: (v: number) => setSets(v), min: 1 },
          { label: "Reps", value: reps, onChange: (v: number) => setReps(v), min: 1 },
        ].map(({ label, value, onChange, min }) => (
          <div key={label} className="col-span-1">
            <p className="text-[10px] text-muted-foreground font-bold uppercase mb-1">{label}</p>
            <input
              type="number"
              value={value}
              min={min}
              onChange={(e) => onChange(Number(e.target.value))}
              className="w-full bg-card border border-border rounded-lg px-2 py-2 text-sm text-center font-bold focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
        ))}
        <div className="col-span-1">
          <p className="text-[10px] text-muted-foreground font-bold uppercase mb-1">Weight</p>
          <input
            type="number"
            placeholder="—"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="w-full bg-card border border-border rounded-lg px-2 py-2 text-sm text-center font-bold focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground/30"
          />
        </div>
        <div className="col-span-1">
          <p className="text-[10px] text-muted-foreground font-bold uppercase mb-1">Rest (s)</p>
          <input
            type="number"
            value={rest}
            min={0}
            onChange={(e) => setRest(Number(e.target.value))}
            className="w-full bg-card border border-border rounded-lg px-2 py-2 text-sm text-center font-bold focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>
      </div>

      <button
        onClick={submit}
        disabled={!name.trim() || createEx.isPending}
        className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-bold disabled:opacity-40 transition-opacity"
      >
        {createEx.isPending ? "Adding..." : "Add Exercise"}
      </button>
    </motion.div>
  );
}

// ── Active workout view ───────────────────────────────────────────────────────
function fmtTime(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function ActiveWorkoutView({ session }: { session: any }) {
  const queryClient = useQueryClient();
  const { startTimer, isActive: restActive } = useGlobalTimer();

  // ── Elapsed timer ──────────────────────────────────────────────────────────
  const [elapsedSec, setElapsedSec] = useState(0);
  const [breakSec, setBreakSec] = useState(0);
  const restStartRef = useRef<number | null>(null);

  useEffect(() => {
    const start = new Date(session.startedAt).getTime();
    const tick = () => setElapsedSec(Math.floor((Date.now() - start) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [session.startedAt]);

  useEffect(() => {
    if (restActive) {
      restStartRef.current = Date.now();
    } else if (restStartRef.current !== null) {
      const elapsed = Math.floor((Date.now() - restStartRef.current) / 1000);
      setBreakSec((prev) => prev + elapsed);
      restStartRef.current = null;
    }
  }, [restActive]);

  const activeSec = Math.max(0, elapsedSec - breakSec);

  const { data: fullPlan } = useGetWorkoutPlan(session.planId);
  const { data: fullSession } = useGetSession(session.id);

  const finishSession = useUpdateSession({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetActiveSessionQueryKey() });
      },
    },
  });

  const exercises = fullPlan?.exercises || [];
  const setLogs = fullSession?.setLogs || [];
  const completedSets = setLogs.filter((l: any) => l.completed).length;
  const totalSets = exercises.reduce((sum: number, ex: any) => sum + ex.sets, 0);

  return (
    <div className="p-4 pt-12 space-y-6 pb-36">
      <div>
        <span className="text-primary text-xs font-bold tracking-widest flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          ACTIVE SESSION
        </span>
        <h1 className="text-3xl font-display font-black tracking-tight">{session.planName}</h1>

        {/* Workout timer strip */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="bg-card border border-border rounded-xl p-2.5 text-center">
            <p className="text-[9px] font-black tracking-widest text-muted-foreground mb-0.5">TOTAL</p>
            <p className="font-display font-bold text-sm tabular-nums">{fmtTime(elapsedSec)}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-2.5 text-center">
            <p className="text-[9px] font-black tracking-widest text-muted-foreground mb-0.5">ACTIVE</p>
            <p className="font-display font-bold text-sm tabular-nums text-primary">{fmtTime(activeSec)}</p>
          </div>
          <div className={cn("bg-card border rounded-xl p-2.5 text-center transition-colors", restActive ? "border-yellow-500/50 bg-yellow-500/10" : "border-border")}>
            <p className="text-[9px] font-black tracking-widest text-muted-foreground mb-0.5">BREAK</p>
            <p className={cn("font-display font-bold text-sm tabular-nums", restActive ? "text-yellow-400" : "")}>{fmtTime(restActive ? breakSec + Math.floor((Date.now() - (restStartRef.current ?? Date.now())) / 1000) : breakSec)}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3 space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground font-bold">
            <span>{completedSets} sets done</span>
            <span>{totalSets} total</span>
          </div>
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: totalSets > 0 ? `${(completedSets / totalSets) * 100}%` : "0%" }}
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {exercises.map((ex: any) => {
          const exLogs = setLogs.filter((l: any) => l.exerciseId === ex.id);
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

      <div className="fixed bottom-24 left-4 right-4 flex gap-3">
        <button
          onClick={() =>
            finishSession.mutate({ id: session.id, data: { status: "completed" } })
          }
          disabled={finishSession.isPending}
          className="flex-1 bg-primary text-primary-foreground py-4 rounded-2xl font-display font-bold text-base flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <Square className="w-5 h-5 fill-current" /> FINISH WORKOUT
        </button>
        <button
          onClick={() => {
            if (confirm("Abort this session?")) {
              finishSession.mutate({ id: session.id, data: { status: "aborted" } });
            }
          }}
          className="w-14 bg-secondary text-muted-foreground py-4 rounded-2xl flex items-center justify-center active:scale-95 transition-all"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

// ── Exercise tracker block ─────────────────────────────────────────────────────
function ExerciseTracker({
  exercise,
  logs,
  sessionId,
  onSetComplete,
}: {
  exercise: any;
  logs: any[];
  sessionId: number;
  onSetComplete: () => void;
}) {
  const queryClient = useQueryClient();
  const [videoOpen, setVideoOpen] = useState(false);
  const logSet = useLogSet();
  const updateSetLog = useUpdateSetLog();

  const handleAddSet = () => {
    const nextSetNum = logs.length + 1;
    logSet.mutate(
      {
        id: sessionId,
        data: {
          exerciseId: exercise.id,
          setNumber: nextSetNum,
          completed: false,
          repsCompleted: exercise.reps,
          weightUsed: exercise.weight || null,
        },
      },
      {
        onSuccess: () =>
          queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey(sessionId) }),
      }
    );
  };

  const handleToggleSet = (
    setId: number,
    completed: boolean,
    reps: number,
    weight: number | null
  ) => {
    updateSetLog.mutate(
      {
        id: sessionId,
        setId,
        data: { completed, repsCompleted: reps, weightUsed: weight },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey(sessionId) });
          if (completed) onSetComplete();
        },
      }
    );
  };

  return (
    <>
      {videoOpen && exercise.videoUrl && (
        <VideoModal url={exercise.videoUrl} onClose={() => setVideoOpen(false)} />
      )}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-border/40 bg-secondary/20 flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-bold">{exercise.name}</h3>
              {exercise.videoUrl && (
                <button
                  onClick={() => setVideoOpen(true)}
                  className="bg-primary/15 hover:bg-primary/25 text-primary border border-primary/30 transition-colors p-2 rounded-lg touch-manipulation flex items-center justify-center min-w-[44px] min-h-[44px]"
                  title="Watch tutorial video"
                >
                  <Video className="w-4 h-4" />
                </button>
              )}
            </div>
          <div className="flex flex-wrap items-center gap-1 mt-0.5">
            {(exercise.tags?.length > 0 ? exercise.tags : [exercise.category]).map((tag) => (
              <span key={tag} className="text-[10px] font-bold text-primary/70 uppercase tracking-wider">
                {tag}
              </span>
            ))}
            <span className="text-[10px] text-muted-foreground">
              · Target {exercise.sets}×{exercise.reps}{exercise.weight ? ` @ ${exercise.weight}kg` : ""}
            </span>
          </div>
          {exercise.description && (
            <p className="text-[10px] text-muted-foreground/60 mt-0.5 line-clamp-1">{exercise.description}</p>
          )}
        </div>
        <span className="text-xs font-bold text-primary shrink-0">
          {logs.filter((l) => l.completed).length}/{exercise.sets}
        </span>
      </div>

      <div className="p-3 space-y-2">
        <div className="grid grid-cols-[2.5rem_1fr_1fr_2.5rem] gap-2 px-1 text-[10px] font-black tracking-widest text-muted-foreground mb-1">
          <div className="text-center">SET</div>
          <div className="text-center">WEIGHT</div>
          <div className="text-center">REPS</div>
          <div className="text-center">✓</div>
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
          disabled={logSet.isPending}
          className="w-full py-3 rounded-xl border border-dashed border-border/60 text-muted-foreground text-xs font-bold flex items-center justify-center gap-2 hover:bg-secondary/40 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> ADD SET
        </button>
      </div>
    </div>
    </>
  );
}

// ── Set row ────────────────────────────────────────────────────────────────────
function SetRow({ log, onToggle }: { log: any; onToggle: (c: boolean, r: number, w: number | null) => void }) {
  const [reps, setReps] = useState<number>(log.repsCompleted ?? 0);
  const [weight, setWeight] = useState<string>(log.weightUsed != null ? String(log.weightUsed) : "");
  const completed = log.completed;

  return (
    <div
      className={cn(
        "grid grid-cols-[2.5rem_1fr_1fr_2.5rem] gap-2 items-center p-2 rounded-xl transition-colors",
        completed ? "bg-primary/8" : "bg-background/60"
      )}
    >
      <div className="text-center text-sm font-bold text-muted-foreground">{log.setNumber}</div>

      <input
        type="number"
        value={weight}
        placeholder="—"
        onChange={(e) => setWeight(e.target.value)}
        className="bg-secondary text-center w-full py-2 rounded-lg text-sm font-bold focus:outline-none focus:ring-1 focus:ring-primary/40 placeholder:text-muted-foreground/30"
      />

      <input
        type="number"
        value={reps}
        min={0}
        onChange={(e) => setReps(Number(e.target.value))}
        className="bg-secondary text-center w-full py-2 rounded-lg text-sm font-bold focus:outline-none focus:ring-1 focus:ring-primary/40"
      />

      <button
        onClick={() => onToggle(!completed, reps, weight ? Number(weight) : null)}
        className={cn(
          "w-9 h-9 rounded-lg flex items-center justify-center transition-all mx-auto",
          completed
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-muted-foreground hover:text-foreground"
        )}
      >
        <Check className={cn("w-4 h-4", completed ? "opacity-100" : "opacity-25")} />
      </button>
    </div>
  );
}
