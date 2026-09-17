import { Component, ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

function isChunkLoadError(error: unknown): boolean {
  const msg = (error as Error)?.message || '';
  const name = (error as Error)?.name || '';
  return (
    name === 'ChunkLoadError' ||
    /Loading chunk|dynamically imported module|Failed to fetch|Importing a module script failed|MIME type/i.test(msg)
  );
}

/**
 * Catches render errors so a single page crash doesn't black out the whole app.
 * When a stale lazy chunk fails to load (typically right after a new deploy),
 * the page is reloaded once to fetch the fresh assets.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
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
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Recharger
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
