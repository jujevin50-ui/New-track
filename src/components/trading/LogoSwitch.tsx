import { FlowSurface } from '@/components/FlowSurface';
import { useLocation, useNavigate } from 'react-router-dom';
import { BarChart3, Landmark } from 'lucide-react';
import { NAV_HEIGHT } from './navStyles';

interface LogoSwitchProps {
  floating?: boolean;
  className?: string;
  size?: number;
}

const FLOATING_CLASS = 'fixed top-2 left-3 z-50';

const TABS = [
  {
    id: 'trading',
    path: '/',
    match: (p: string) => p !== '/finance',
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
] as const;

/** Sélecteur de modules : le nom se dévoile dans la pilule au survol ou au focus. */
export function LogoSwitch({ floating = false, className = '' }: LogoSwitchProps) {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <div
      role="navigation"
      aria-label="Modules de l'application"
      className={`module-switch flex items-center gap-1 px-1 ${floating ? FLOATING_CLASS : ''} ${className}`}
      style={{ height: NAV_HEIGHT }}
    >
      <FlowSurface />
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
                ? 'is-current'
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
