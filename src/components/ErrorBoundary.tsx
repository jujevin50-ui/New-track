import { Button } from '@/components/ui/button';
import { Component, ReactNode } from 'react';
import { isAssetLoadError, recoverAppAssets } from '@/lib/assetRecovery';
import { CircleAlert, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  /** Change this key to reset the error state after navigation */
  resetKey?: string;
}

interface State {
  hasError: boolean;
  message: string;
  assetError: boolean;
  refreshing: boolean;
}

/**
 * Catches render errors so a single page crash doesn't black out the whole app.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '', assetError: false, refreshing: false };

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      assetError: isAssetLoadError(error),
      refreshing: false,
      message: (error as Error)?.message || 'Erreur inconnue',
    };
  }

  componentDidUpdate(prev: Props) {
    if (prev.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false, message: '', assetError: false, refreshing: false });
    }
  }

  componentDidCatch(error: unknown) {
    console.error('[ErrorBoundary]', error);
    recoverAppAssets(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" className="min-h-[60vh] flex flex-col items-center justify-center gap-4 p-6 text-center bg-background text-foreground">
          <CircleAlert className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <h1 className="max-w-lg text-xl font-semibold tracking-tight">{this.state.assetError ? 'La version de cette page doit être actualisée.' : 'Une erreur est survenue lors du chargement de cette page.'}</h1>
          <p className="text-xs text-muted-foreground max-w-md break-words">{this.state.assetError ? navigator.onLine === false ? 'La connexion est indisponible. Reconnectez-vous puis réessayez.' : 'Récupérez les derniers fichiers de l’application. Vos données sont conservées.' : 'La page peut être actualisée. Vos données déjà enregistrées sont conservées.'}</p>
          {!this.state.assetError && <details className="max-w-lg text-left text-xs text-muted-foreground"><summary className="cursor-pointer py-3">Détails techniques</summary><p className="break-words leading-relaxed">{this.state.message}</p></details>}
          <Button
            loading={this.state.refreshing}
            onClick={() => { if (this.state.assetError) { if (recoverAppAssets(Object.assign(new Error(this.state.message), { name: 'ChunkLoadError' }), true)) this.setState({ refreshing: true }); } else window.location.reload(); }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            {!this.state.refreshing && <RefreshCw className="h-4 w-4" aria-hidden="true" />}
            {this.state.refreshing ? 'Actualisation…' : this.state.assetError ? 'Actualiser l’application' : 'Recharger'}
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
