import { useLocation, useNavigate } from 'react-router-dom';
import { BarChart3, Landmark, CheckSquare } from 'lucide-react';
import { NAV_HEIGHT } from './navStyles';

interface LogoSwitchProps {
  floating?: boolean;
  className?: string;
  size?: number;
}

const FLOATING_CLASS = 'fixed top-4 left-6 z-50';

const TABS = [
  {
    id: 'trading',
    path: '/',
    match: (p: string) => !['/finance', '/tasks'].includes(p),
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
    id: 'tasks',
    path: '/tasks',
    match: (p: string) => p === '/tasks',
    label: 'Tâches',
    Icon: CheckSquare,
  },
] as const;

/**
 * Sélecteur d'onglets : Track Record · My Finance · Tâches.
 */
export function LogoSwitch({ floating = false, className = '' }: LogoSwitchProps) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div
      role="tablist"
      aria-label="Modules de l'application"
      className={`flex items-center gap-0.5 px-1 rounded-full bg-card border border-border shadow-[var(--shadow-card)] ${floating ? FLOATING_CLASS : ''} ${className}`}
      style={{ height: NAV_HEIGHT }}
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
            className={`h-8 w-8 inline-flex items-center justify-center rounded-full transition-all duration-150 ${
              active
                ? 'bg-primary text-primary-foreground shadow-sm scale-105'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary active:scale-95'
            }`}
          >
            <Icon className="h-4 w-4" strokeWidth={active ? 2.4 : 2} />
          </button>
        );
      })}
    </div>
  );
}
