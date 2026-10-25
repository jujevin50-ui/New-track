import { useLocation, useNavigate } from 'react-router-dom';
import { BarChart3, Landmark, Target } from 'lucide-react';

interface LogoSwitchProps {
  /** Position fixe en haut à gauche (legacy, peu utilisé) */
  floating?: boolean;
  /** Classes supplémentaires */
  className?: string;
  /** Taille du logo en px — conservé pour compatibilité, non utilisé */
  size?: number;
}

const FLOATING_CLASS = 'fixed top-4 left-6 z-50';

const TABS = [
  {
    id: 'trading',
    path: '/',
    match: (p: string) => p !== '/finance' && p !== '/habits',
    label: 'Track Record',
    Icon: BarChart3,
  },
  {
    id: 'finance',
    path: '/finance',
    match: (p: string) => p === '/finance',
    label: 'My Finance',
    Icon: Landmark,
  },
  {
    id: 'habits',
    path: '/habits',
    match: (p: string) => p === '/habits',
    label: 'Habitudes',
    Icon: Target,
  },
] as const;

/**
 * Sélecteur d'onglets principaux : Track Record · My Finance · Habitudes.
 * Chaque onglet est représenté par une icône.
 */
export function LogoSwitch({ floating = false, className = '' }: LogoSwitchProps) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div
      role="tablist"
      aria-label="Modules de l'application"
      className={`flex items-center gap-0.5 h-[56px] px-1 rounded-full bg-card border border-border shadow-[var(--shadow-card)] ${floating ? FLOATING_CLASS : ''} ${className}`}
    >
      {TABS.map(({ id, path, match, label, Icon }) => {
        const active = match(location.pathname);
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            aria-label={label}
            title={label}
            onClick={() => {
              if (!active) navigate(path);
            }}
            className={`h-11 w-11 inline-flex items-center justify-center rounded-full transition-all duration-150 ${
              active
                ? 'bg-primary text-primary-foreground shadow-sm scale-105'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary active:scale-95'
            }`}
          >
            <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.4 : 2} />
          </button>
        );
      })}
    </div>
  );
}
