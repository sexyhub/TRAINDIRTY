import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import { TimerProvider } from "@/lib/timer-context";
import { useAuth, AuthProvider } from "@workspace/replit-auth-web";
import { Dumbbell, Loader2, Lock, Hash, Eye, EyeOff, UserPlus } from "lucide-react";
import { useState } from "react";

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

function LoginScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [masterPassword, setMasterPassword] = useState("");
  const [masterPin, setMasterPin] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result =
        mode === "login"
          ? await login(masterPassword, masterPin)
          : await register(name, masterPassword, masterPin);

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
          Track your lifts, hit your PRs, and build consistency — one session at
          a time.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-4">
        <div className="flex rounded-xl bg-card border border-border overflow-hidden">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError("");
            }}
            className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider transition-colors ${mode === "login" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setError("");
            }}
            className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider transition-colors ${mode === "register" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            Sign Up
          </button>
        </div>

        <div className="space-y-3">
          {mode === "register" && (
            <div className="relative">
              <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Your Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
                className="w-full bg-card border border-border rounded-xl pl-12 pr-4 py-4 text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          )}

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Master Password"
              value={masterPassword}
              onChange={(e) => setMasterPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
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

          <div className="relative">
            <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="password"
              inputMode="numeric"
              pattern="\d{4,8}"
              placeholder="Master PIN (4-8 digits)"
              value={masterPin}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "").slice(0, 8);
                setMasterPin(v);
              }}
              required
              minLength={4}
              maxLength={8}
              autoComplete="off"
              className="w-full bg-card border border-border rounded-xl pl-12 pr-4 py-4 text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors tracking-[0.3em]"
            />
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
          ) : mode === "login" ? (
            "Log In"
          ) : (
            "Create Account"
          )}
        </button>

        {mode === "register" && (
          <p className="text-muted-foreground text-xs text-center leading-relaxed">
            Remember your master password and PIN — they are your only way to
            access your account. They cannot be recovered.
          </p>
        )}
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
