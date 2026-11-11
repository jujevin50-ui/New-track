import AppUpdatePrompt from '@/components/AppUpdatePrompt';
import { PageSkeleton } from '@/components/ui/page-skeleton';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { DataProvider, useData } from "@/contexts/DataContext";
import { useAccounts } from "@/hooks/useAccounts";
import { AppLayout } from "@/components/trading/AppLayout";
import { useState, useEffect, useLayoutEffect, useRef, useMemo, lazy, Suspense, type ComponentType } from "react";
import { BarChart3, FolderOpen, FilePlus, HardDrive, RefreshCw } from "lucide-react";
import { Trade } from "@/types/trade";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LogoTransitionProvider } from "@/components/trading/LogoTransition";
import { useUserProfile } from "@/hooks/useUserProfile";
import { WelcomeSplash } from "@/components/trading/WelcomeSplash";
import { recoverAppAssets } from "@/lib/assetRecovery";
import { AppBackground } from "@/components/AppBackground";

function lazyWithReload<T extends { default: ComponentType<any> }>(factory: () => Promise<T>) {
  return lazy(() => factory().catch((err) => {
    if (recoverAppAssets(err)) return new Promise<T>(() => {});
    throw err;
  }));
}

const Dashboard = lazyWithReload(() => import("./pages/Dashboard"));
const CalendarView = lazyWithReload(() => import("./pages/CalendarView"));
const Payouts = lazyWithReload(() => import("./pages/Payouts"));
const Trades = lazyWithReload(() => import("./pages/Trades"));
const Accounts = lazyWithReload(() => import("./pages/Accounts"));
const Reports = lazyWithReload(() => import("./pages/Reports"));
const Discipline = lazyWithReload(() => import("./pages/Discipline"));
const Strategy = lazyWithReload(() => import("./pages/Strategy"));
const Finance = lazyWithReload(() => import("./pages/Finance"));
const AiAssistant = lazyWithReload(() => import("./pages/AiAssistant"));
import NotFound from "./pages/NotFound";

const PageLoader = PageSkeleton;

const queryClient = new QueryClient();

function FileSetupScreen() {
  const { status, connectNew, connectExisting, reconnect } = useData();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const handle = async (fn: () => Promise<void>) => {
    setBusy(true); setError("");
    try { await fn(); } catch (e: any) { if (e?.name !== "AbortError") setError(e?.message || "Erreur"); }
    finally { setBusy(false); }
  };
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-6 p-6">
      <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center"><HardDrive className="h-7 w-7 text-primary" /></div>
      <div className="text-center"><h1 className="text-xl font-semibold mb-1">Connecter votre fichier de données</h1><p className="text-sm text-muted-foreground max-w-sm">Vos données sont stockées localement sur votre PC dans un fichier JSON que vous choisissez.</p></div>
      {status === "needs-reconnect" ? (
        <div className="flex flex-col items-center gap-3"><p className="text-xs text-muted-foreground">Le fichier précédent nécessite une nouvelle autorisation.</p><button onClick={() => handle(reconnect)} disabled={busy} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"><RefreshCw className="h-4 w-4" />Ré-autoriser le fichier</button></div>
      ) : (
        <div className="flex gap-3 w-full max-w-sm"><button onClick={() => handle(connectNew)} disabled={busy} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-border bg-card rounded-lg text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"><FilePlus className="h-4 w-4" />Nouveau fichier vide</button><button onClick={() => handle(connectExisting)} disabled={busy} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-border bg-card rounded-lg text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"><FolderOpen className="h-4 w-4" />Ouvrir existant</button></div>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
      <p className="text-[11px] text-muted-foreground/60">Fonctionne sur Chrome / Edge · Fichier .json sur votre disque</p>
    </div>
  );
}

const AppContent = () => {
  const { status, data } = useData();
  const { accounts, activeAccount, activeAccountId, setActiveAccountId, addAccount, updateAccount, deleteAccount, categories } = useAccounts();
  const { userName } = useUserProfile();
  const [showSplash, setShowSplash] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const previousPath = useRef(location.pathname);
  useLayoutEffect(() => {
    if (previousPath.current !== location.pathname && location.pathname === '/finance') setShowSplash(true);
    previousPath.current = location.pathname;
  }, [location.pathname]);
  const [routeRestored, setRouteRestored] = useState(false);

  const allTrades: Trade[] = useMemo(() => {
    const raw = Array.isArray(data?.trades) ? (data.trades as any[]) : [];
    return raw.map(t => ({
      id: t.id, tradeNumber: t.tradeNumber, date: t.date, endDate: t.endDate, pair: t.pair, type: t.type,
      result: Number(t.result), commission: Number(t.commission), swap: Number(t.swap), exitType: t.exitType,
      setupQuality: t.setupQuality, strategyRespected: t.strategyRespected, screenshots: t.screenshots || [], notes: t.notes || "", accountId: t.accountId,
    }));
  }, [data?.trades]);

  useEffect(() => {
    if (!routeRestored && status === "connected") {
      const last = localStorage.getItem("app-last-route");
      // Ne restaure que les routes encore disponibles.
      const allowed = ["/", "/calendar", "/trades", "/reports", "/ai-assistant", "/accounts", "/finance", "/strategy", "/discipline", "/payout"];
      if (last && last !== location.pathname && allowed.includes(last)) {
        navigate(last, { replace: true });
      }
      setRouteRestored(true);
    }
  }, [status]);
  useEffect(() => { localStorage.setItem("app-last-route", location.pathname); }, [location.pathname]);

  if (status === "loading") return <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4"><div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center animate-pulse"><BarChart3 className="h-5 w-5 text-primary" /></div><p className="text-xs text-muted-foreground">Chargement...</p></div>;
  if (status === "disconnected" || status === "needs-reconnect") return <FileSetupScreen />;

  const isAllView = activeAccountId === "all";
  const displayAccount = isAllView ? (accounts.length > 0 ? {
    id: "all", name: "All Accounts", broker: "", currency: "", createdAt: "", status: "active" as const, category: "",
    initialBalance: accounts.reduce((s, a) => s + a.initialBalance, 0), payoutIntervalDays: 0, dailyDrawdownPct: 0, maxDrawdownPct: 0, riskPct: 1,
  } : null) : activeAccount;

  const splash = showSplash && <WelcomeSplash name={userName} showGreeting={location.pathname !== "/finance"} onDone={() => setShowSplash(false)} />;

  if (location.pathname === "/finance") {
    return (
      <>{splash}<div className="relative z-10 min-h-screen text-foreground" aria-hidden={showSplash || undefined} {...(showSplash ? {inert: ''} : {})}>
        <ErrorBoundary resetKey="finance">
          <Suspense fallback={<PageLoader />}>
            <Finance />
          </Suspense>
        </ErrorBoundary>
      </div></>
    );
  }

  return (
    <>
      {splash}
      <div className="relative z-10" aria-hidden={showSplash || undefined} {...(showSplash ? {inert: ''} : {})}>
        <AppLayout accounts={accounts} activeAccountId={activeAccountId} onSelectAccount={setActiveAccountId}>
          <ErrorBoundary resetKey={location.pathname}>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/discipline" element={<Discipline activeAccount={displayAccount} accounts={accounts} onSelectAccount={setActiveAccountId} />} />
                <Route path="/strategy" element={<Strategy accounts={accounts} activeAccountId={activeAccountId} onSelectAccount={setActiveAccountId} />} />
                <Route path="/tasks" element={<Navigate to="/" replace />} />
                <Route path="/" element={<Dashboard activeAccount={displayAccount} accounts={accounts} onSelectAccount={setActiveAccountId} />} />
                <Route path="/calendar" element={<CalendarView activeAccount={displayAccount} accounts={accounts} onSelectAccount={setActiveAccountId} />} />
                <Route path="/trades" element={<Trades activeAccount={displayAccount} accounts={accounts} onSelectAccount={setActiveAccountId} />} />
                <Route path="/reports" element={<Reports activeAccount={displayAccount} accounts={accounts} onSelectAccount={setActiveAccountId} />} />
                <Route path="/weekly-report" element={<Navigate to="/reports" replace />} />
                <Route path="/daily-report" element={<Navigate to="/calendar#daily-review" replace />} />
                <Route path="/ai-assistant" element={<AiAssistant activeAccount={displayAccount} accounts={accounts} onSelectAccount={setActiveAccountId} />} />
                <Route path="/payout" element={<Payouts accounts={accounts} activeAccountId={activeAccountId} onSelectAccount={setActiveAccountId} />} />
                <Route path="/accounts" element={<Accounts accounts={accounts} onAdd={addAccount} onUpdate={updateAccount} onDelete={deleteAccount} categories={categories} allTrades={allTrades} />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </AppLayout>
      </div>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AppUpdatePrompt />
      <BrowserRouter>
        <AppBackground />
        <LogoTransitionProvider>
          <DataProvider>
            <Routes>
              <Route path="/*" element={<AppContent />} />
            </Routes>
          </DataProvider>
        </LogoTransitionProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
