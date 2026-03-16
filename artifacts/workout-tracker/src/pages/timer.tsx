import { useState } from "react";
import { motion } from "framer-motion";
import { useGlobalTimer } from "@/lib/timer-context";
import { Play, Pause, RotateCcw } from "lucide-react";
import { cn } from "@/components/layout";

const PRESETS = [30, 60, 90, 120, 180];

export default function TimerPage() {
  const { timeLeft, totalTime, isActive, startTimer, pauseTimer, resumeTimer, resetTimer } = useGlobalTimer();
  const [customTime, setCustomTime] = useState(60);

  const formatDisplay = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const progress = totalTime > 0 ? ((totalTime - timeLeft) / totalTime) * 100 : 0;
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-6 pt-12 flex flex-col items-center justify-center min-h-[80vh] space-y-12">
      
      {/* Circular Timer Display */}
      <div className="relative w-72 h-72 flex items-center justify-center">
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 280 280">
          <circle cx="140" cy="140" r={radius} className="stroke-secondary fill-none stroke-[8px]" />
          <circle 
            cx="140" cy="140" r={radius} 
            className="stroke-primary fill-none stroke-[8px] transition-all duration-1000 ease-linear"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>
        <div className="text-center z-10">
          <p className="text-7xl font-display font-black tracking-tighter">{formatDisplay(timeLeft)}</p>
          <p className="text-muted-foreground tracking-widest text-sm mt-2 uppercase">Rest Timer</p>
        </div>
      </div>

      {/* Controls — reset | play | spacer keeps play perfectly centred */}
      <div className="flex items-center justify-center gap-6">
        <button 
          onClick={resetTimer}
          className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <RotateCcw className="w-6 h-6" />
        </button>
        
        {isActive ? (
          <button 
            onClick={pauseTimer}
            className="w-20 h-20 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/20 active:scale-95 transition-transform"
          >
            <Pause className="w-8 h-8 fill-current" />
          </button>
        ) : (
          <button 
            onClick={() => timeLeft > 0 ? resumeTimer() : startTimer(customTime)}
            className="w-20 h-20 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/20 active:scale-95 transition-transform"
          >
            <Play className="w-8 h-8 fill-current translate-x-0.5" />
          </button>
        )}

        {/* Invisible counterweight so the play button stays centred */}
        <div className="w-14 h-14 pointer-events-none" aria-hidden />
      </div>

      {/* Presets */}
      <div className="w-full max-w-sm">
        <p className="text-xs text-muted-foreground font-bold tracking-widest uppercase mb-4 text-center">Quick Select</p>
        <div className="flex flex-wrap justify-center gap-3">
          {PRESETS.map(secs => (
            <button
              key={secs}
              onClick={() => { setCustomTime(secs); startTimer(secs); }}
              className={cn(
                "px-5 py-2.5 rounded-xl text-sm font-bold border transition-colors",
                totalTime === secs && timeLeft > 0 ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:bg-secondary"
              )}
            >
              {secs < 60 ? `${secs}s` : `${secs/60}m`}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
