import { Link, useLocation } from "wouter";
import { Home, Dumbbell, Activity, Timer, User } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { useGlobalTimer } from "@/lib/timer-context";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { timeLeft, isActive } = useGlobalTimer();

  const navItems = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/log", icon: Dumbbell, label: "Log" },
    { href: "/timer", icon: Timer, label: "Timer" },
    { href: "/stats", icon: Activity, label: "Stats" },
    { href: "/profile", icon: User, label: "Profile" },
  ];

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <main className="flex-1 pb-24 overflow-x-hidden">
        {children}
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-50">
        {/* Floating Active Timer Indicator */}
        {isActive && location !== '/timer' && (
          <div className="mx-4 mb-3 px-4 py-2 bg-primary text-primary-foreground rounded-full font-display font-bold flex items-center justify-between shadow-lg shadow-primary/20 animate-in slide-in-from-bottom-5">
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4 animate-pulse" />
              <span className="text-sm tracking-wider">RESTING</span>
            </div>
            <span className="text-lg">{formatTime(timeLeft)}</span>
          </div>
        )}

        <nav className="bg-card/90 backdrop-blur-xl border-t border-border px-4 py-3 pb-safe">
          <ul className="flex justify-between items-center max-w-md mx-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = location === item.href;
              return (
                <li key={item.href}>
                  <Link href={item.href} className={cn(
                    "flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all duration-300",
                    active ? "text-primary scale-110" : "text-muted-foreground hover:text-foreground"
                  )}>
                    <Icon className={cn("w-6 h-6", active && "stroke-[2.5px]")} />
                    <span className="text-[10px] font-display mt-1 opacity-80">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </div>
  );
}
