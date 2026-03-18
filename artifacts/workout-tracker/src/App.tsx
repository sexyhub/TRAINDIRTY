import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import { TimerProvider } from "@/lib/timer-context";
import { useAuth, AuthProvider } from "@workspace/replit-auth-web";
import { Loader2, Lock, Eye, EyeOff } from "lucide-react";
import { useState, useRef } from "react";

import Home from "@/pages/home";
import LogPage from "@/pages/log";
import StatsPage from "@/pages/stats";
import TimerPage from "@/pages/timer";
import ProfilePage from "@/pages/profile";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function PinBoxes({
  value,
  onChange,
}: {
  value: string;
  onChange: (pin: string) => void;
}) {
  const refs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const handleChange = (index: number, digit: string) => {
    const d = digit.replace(/\D/g, "").slice(-1);
    const arr = value.padEnd(4, " ").split("");
    arr[index] = d;
    const next = arr.map((c) => (c === " " ? "" : c)).join("");
    onChange(next);
    if (d && index < 3) {
      refs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !value[index] && index > 0) {
      refs[index - 1].current?.focus();
      const arr = value.padEnd(4, " ").split("");
      arr[index - 1] = "";
      onChange(arr.map((c) => (c === " " ? "" : c)).join(""));
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    onChange(pasted);
    const focusIdx = Math.min(pasted.length, 3);
    refs[focusIdx].current?.focus();
  };

  return (
    <div className="flex gap-3 justify-center">
      {[0, 1, 2, 3].map((i) => (
        <input
          key={i}
          ref={refs[i]}
          type="password"
          inputMode="numeric"
          maxLength={1}
          value={value[i] || ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={i === 0 ? handlePaste : undefined}
          autoComplete="off"
          className="w-14 h-14 bg-card border border-border rounded-xl text-center text-white text-2xl font-bold focus:outline-none focus:border-primary transition-colors"
        />
      ))}
    </div>
  );
}

function LoginScreen() {
  const { login } = useAuth();
  const [masterPassword, setMasterPassword] = useState("");
  const [masterPin, setMasterPin] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (masterPin.length !== 4) {
      setError("Enter all 4 PIN digits.");
      return;
    }
    setLoading(true);

    try {
      const result = await login(masterPassword, masterPin);
      if (result.error) {
        setError(result.error);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-8 p-8">
      <div className="flex flex-col items-center gap-4">
        <div className="w-20 h-20 rounded-3xl overflow-hidden shadow-2xl shadow-primary/30">
          <img src="/favicon.png" alt="Logo" className="w-full h-full object-cover" />
        </div>
        <h1 className="text-3xl font-black tracking-tight text-white">
          TRAIN DIRTY
        </h1>
        <p className="text-muted-foreground text-center text-sm max-w-xs">
          Enter your credentials to continue.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-6">
        <div className="space-y-5">
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold text-center">
              Master PIN
            </p>
            <PinBoxes value={masterPin} onChange={setMasterPin} />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Master Password"
              value={masterPassword}
              onChange={(e) => setMasterPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full bg-card border border-border rounded-xl pl-12 pr-12 py-4 text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {error && (
          <p className="text-destructive text-sm text-center font-medium">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-base active:scale-95 transition-transform shadow-lg shadow-primary/20 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin mx-auto" />
          ) : (
            "Log In"
          )}
        </button>
      </form>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
    </div>
  );
}

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/log" component={LogPage} />
        <Route path="/stats" component={StatsPage} />
        <Route path="/timer" component={TimerPage} />
        <Route path="/profile" component={ProfilePage} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function AppShell() {
  return (
    <TimerProvider>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </TimerProvider>
  );
}

function AuthenticatedApp() {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <LoginScreen />;

  return <AppShell />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthenticatedApp />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
