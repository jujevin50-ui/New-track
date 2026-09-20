import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { DataProvider, useData } from "@/contexts/DataContext";
import { useAccounts } from "@/hooks/useAccounts";
import { AppLayout } from "@/components/trading/AppLayout";
import { useState, useEffect, useMemo, lazy, Suspense, type ComponentType } from "react";
import { BarChart3, FolderOpen, FilePlus, HardDrive, RefreshCw } from "lucide-react";
import { Trade } from "@/types/trade";
import { getNetResult } from "@/types/trade";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useUserProfile } from "@/hooks/useUserProfile";
import { WelcomeSplash } from "@/components/trading/WelcomeSplash";

// Reload once when a lazy chunk fails to load (stale assets after a new deploy).
function lazyWithReload<T extends { default: ComponentType<any> }>(
  factory: () => Promise<T>
) {
  return lazy(() =>
    factory().catch((err) => {
      const key = "chunk-reload-at";
      const last = Number(sessionStorage.getItem(key) || 0);
      if (Date.now() - last > 10000) {
        sessionStorage.setItem(key, String(Date.now()));
        window.location.reload();
        return new Promise<T>(() => {}); // never resolves; the page is reloading
      }
      throw err;
    })
  );
}

const Dashboard = lazyWithReload(() => import("./pages/Dashboard"));
const CalendarView = lazyWithReload(() => import("./pages/CalendarView"));
const Trades = lazyWithReload(() => import("./pages/Trades"));
const Accounts = lazyWithReload(() => import("./pages/Accounts"));
const WeeklyReport = lazyWithReload(() => import("./pages/WeeklyReport"));
const AiAssistant = lazyWithReload(() => import("./pages/AiAssistant"));
import NotFound from "./pages/NotFound";

const PageLoader = () => (
  <div className="flex-1 flex items-center justify-center">
    <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center animate-pulse">
      <BarChart3 className="h-4 w-4 text-primary" />
    </div>
  </div>
);

const queryClient = new QueryClient();

function FileSetupScreen() {
  const { status, connectNew, connectExisting, reconnect } = useData();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handle = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try { await fn(); } catch (e: any) {
      if (e?.name !== 'AbortError') setError(e?.message || 'Erreur');
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-6 p-6">
      <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
        <HardDrive className="h-7 w-7 text-primary" />
      </div>
      <div className="text-center">
        <h1 className="text-xl font-semibold mb-1">Connecter votre fichier de données</h1>
        <p className="text-sm text-muted-foreground max-w-sm">
          Vos données sont stockées localement sur votre PC dans un fichier JSON que vous choisissez.
        </p>
      </div>

      {status === 'needs-reconnect' ? (
        <div className="flex flex-col items-center gap-3">
          <p className="text-xs text-muted-foreground">Le fichier précédent nécessite une nouvelle autorisation.</p>
          <button
            onClick={() => handle(reconnect)}
            disabled={busy}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <RefreshCw className="h-4 w-4" />
            Ré-autoriser le fichier
          </button>
        </div>
      ) : (
        <div className="flex gap-3 w-full max-w-sm">
          <button
            onClick={() => handle(connectNew)}
            disabled={busy}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-border bg-card rounded-lg text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
          >
            <FilePlus className="h-4 w-4" />
            Nouveau fichier vide
          </button>
          <button
            onClick={() => handle(connectExisting)}
            disabled={busy}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-border bg-card rounded-lg text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
          >
            <FolderOpen className="h-4 w-4" />
            Ouvrir existant
          </button>
        </div>
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
  const [routeRestored, setRouteRestored] = useState(false);

  const allTrades: Trade[] = useMemo(() => (data.trades as any[]).map(t => ({
    id: t.id, tradeNumber: t.tradeNumber, date: t.date, endDate: t.endDate,
    pair: t.pair, type: t.type, result: Number(t.result), commission: Number(t.commission),
    swap: Number(t.swap), exitType: t.exitType, setupQuality: t.setupQuality,
    strategyRespected: t.strategyRespected, screenshots: t.screenshots || [],
    notes: t.notes || '', accountId: t.accountId,
  })), [data.trades]);

  useEffect(() => {
    if (!routeRestored && status === 'connected') {
      const last = localStorage.getItem('app-last-route');
      if (last && last !== location.pathname) {
        navigate(last, { replace: true });
      }
      setRouteRestored(true);
    }
  }, [status]);

  useEffect(() => {
    localStorage.setItem('app-last-route', location.pathname);
  }, [location.pathname]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center animate-pulse">
          <BarChart3 className="h-5 w-5 text-primary" />
        </div>
        <p className="text-xs text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  if (status === 'disconnected' || status === 'needs-reconnect') {
    return <FileSetupScreen />;
  }

  const isAllView = activeAccountId === 'all';
  const displayAccount = isAllView
    ? (accounts.length > 0
      ? { id: 'all', name: 'All Accounts', broker: '', currency: '', createdAt: '', status: 'active' as const, category: '', initialBalance: accounts.reduce((s, a) => s + a.initialBalance, 0), payoutIntervalDays: 0, dailyDrawdownPct: 0, maxDrawdownPct: 0, riskPct: 1 }
      : null)
    : activeAccount;

  return (
    <>
      {showSplash && <WelcomeSplash name={userName} onDone={() => setShowSplash(false)} />}
      <AppLayout accounts={accounts} activeAccountId={activeAccountId} onSelectAccount={setActiveAccountId}>
      <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Dashboard activeAccount={displayAccount} accounts={accounts} />} />
          <Route path="/calendar" element={<CalendarView activeAccount={displayAccount} accounts={accounts} />} />
          <Route path="/trades" element={<Trades activeAccount={displayAccount} accounts={accounts} onAddAccount={addAccount} onUpdateAccount={updateAccount} />} />
          <Route path="/weekly-report" element={<WeeklyReport activeAccount={displayAccount} accounts={accounts} />} />
          <Route path="/ai-assistant" element={<AiAssistant activeAccount={displayAccount} accounts={accounts} />} />
          <Route
            path="/accounts"
            element={
              <Accounts
                accounts={accounts}
                activeAccountId={activeAccountId}
                onSelectAccount={setActiveAccountId}
                onAdd={addAccount}
                onUpdate={updateAccount}
                onDelete={deleteAccount}
                categories={categories}
                allTrades={allTrades}
              />
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      </ErrorBoundary>
      </AppLayout>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <DataProvider>
          <Routes>
            <Route path="/*" element={<AppContent />} />
          </Routes>
        </DataProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
