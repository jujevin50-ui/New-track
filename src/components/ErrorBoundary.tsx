import { Component, ReactNode } from 'react';
import { RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
  /** Quand cette valeur change (ex: la route), l'erreur est effacée et la page est ré-essayée. */
  resetKey?: string;
}

interface State {
  hasError: boolean;
  message: string;
}

function isChunkLoadError(error: unknown): boolean {
  const msg = (error as Error)?.message || '';
  const name = (error as Error)?.name || '';
  return (
    name === 'ChunkLoadError' ||
    /Loading chunk|dynamically imported module|Failed to fetch|Importing a module script failed|MIME type/i.test(msg)
  );
}

/** Supprime le service worker et tous les caches, puis recharge : règle les assets périmés. */
async function clearCacheAndReload() {
  try {
    const regs = await navigator.serviceWorker?.getRegistrations?.();
    await Promise.all((regs || []).map(r => r.unregister()));
    const keys = await caches?.keys?.();
    await Promise.all((keys || []).map(k => caches.delete(k)));
  } catch { /* ignore */ }
  window.location.reload();
}

/**
 * Catches render errors so a single page crash doesn't black out the whole app.
 * - L'erreur est effacée automatiquement quand on change de page (resetKey).
 * - When a stale lazy chunk fails to load (typically right after a new deploy),
 *   the page is reloaded once to fetch the fresh assets.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, message: (error as Error)?.message || String(error) };
  }

  componentDidUpdate(prev: Props) {
    if (this.state.hasError && prev.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, message: '' });
    }
  }

  componentDidCatch(error: unknown) {
    console.error('[ErrorBoundary]', error);
    if (isChunkLoadError(error)) {
      const key = 'chunk-reload-at';
      const last = Number(sessionStorage.getItem(key) || 0);
      // Avoid reload loops: only auto-reload if we haven't just done so.
      if (Date.now() - last > 10000) {
        sessionStorage.setItem(key, String(Date.now()));
        window.location.reload();
      }
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 min-h-[60vh] flex flex-col items-center justify-center gap-4 p-6 text-center">
          <p className="text-sm text-muted-foreground">Une erreur est survenue lors du chargement de cette page.</p>
          {this.state.message && (
            <code className="max-w-xl text-[11px] text-destructive/90 bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2 break-words">
              {this.state.message}
            </code>
          )}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={() => this.setState({ hasError: false, message: '' })}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Réessayer
            </button>
            <button
              onClick={clearCacheAndReload}
              className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              Vider le cache et recharger
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
