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

/** Sélecteur de modules : le nom se dévoile dans la pilule au survol ou au focus. */
export function LogoSwitch({ floating = false, className = '' }: LogoSwitchProps) {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <div
      role="navigation"
      aria-label="Modules de l'application"
      className={`rb-liquid flex items-center gap-0.5 px-1 rounded-full ${floating ? FLOATING_CLASS : ''} ${className}`}
      style={{ height: NAV_HEIGHT }}
    >
      {TABS.map(({ id, path, match, label, Icon }) => {
        const active = match(location.pathname);
        return (
          <button
            key={id}
            type="button"
            aria-current={active ? 'page' : undefined}
            aria-label={label}
            onClick={() => {
              if (!active) navigate(path);
            }}
            className={`module-tab ${
              active
                ? 'selected-tab'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/70'
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" strokeWidth={active ? 2.4 : 2} />
            <span className="module-tab-label" aria-hidden="true"><span>{label}</span></span>
          </button>
        );
      })}
    </div>
  );
}
