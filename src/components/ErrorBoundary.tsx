import { Component, ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  /** Change this key to reset the error state after navigation */
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

/**
 * Catches render errors so a single page crash doesn't black out the whole app.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      message: (error as Error)?.message || 'Erreur inconnue',
    };
  }

  componentDidUpdate(prev: Props) {
    if (prev.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false, message: '' });
    }
  }

  componentDidCatch(error: unknown) {
    console.error('[ErrorBoundary]', error);
    if (isChunkLoadError(error)) {
      const key = 'chunk-reload-at';
      const last = Number(sessionStorage.getItem(key) || 0);
      if (Date.now() - last > 10000) {
        sessionStorage.setItem(key, String(Date.now()));
        window.location.reload();
      }
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 p-6 text-center bg-background text-foreground">
          <p className="text-sm font-medium">Une erreur est survenue lors du chargement de cette page.</p>
          <p className="text-xs text-muted-foreground max-w-md break-words">{this.state.message}</p>
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
