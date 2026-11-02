import { useState } from 'react';
import { createPortal } from 'react-dom';
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

interface Tip {
  id: string;
  x: number; // centre horizontal du bouton (px écran)
  y: number; // bas du bouton (px écran)
  dx: number; // position de la souris sur le bouton, de -1 (gauche) à 1 (droite)
}

/**
 * Sélecteur d'onglets : Track Record · My Finance · Tâches.
 * Au survol, une bulle « liquid glass » avec le logo + le nom de la page apparaît
 * sous le bouton (ressort + flou), et suit légèrement la souris.
 */
export function LogoSwitch({ floating = false, className = '' }: LogoSwitchProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [tip, setTip] = useState<Tip | null>(null);

  const showTip = (id: string, el: HTMLElement, clientX?: number) => {
    const r = el.getBoundingClientRect();
    const dx = clientX === undefined ? 0 : Math.max(-1, Math.min(1, (clientX - (r.left + r.width / 2)) / (r.width / 2)));
    setTip({ id, x: r.left + r.width / 2, y: r.bottom, dx });
  };

  const current = tip ? TABS.find(t => t.id === tip.id) : undefined;

  return (
    <div
      role="tablist"
      aria-label="Modules de l'application"
      className={`rb-liquid flex items-center gap-0.5 px-1 rounded-full ${floating ? FLOATING_CLASS : ''} ${className}`}
      style={{ height: NAV_HEIGHT }}
    >
      {/* Filtre de réfraction du liquid glass (utilisé par .rb-liquid, Chrome/Edge) */}
      <svg width="0" height="0" aria-hidden focusable="false" style={{ position: 'absolute' }}>
        <defs>
          <filter id="rb-liquid-filter" x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.008 0.02" numOctaves={2} seed={3} result="noise" />
            <feGaussianBlur in="noise" stdDeviation="2" result="map" />
            <feDisplacementMap in="SourceGraphic" in2="map" scale={16} xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>

      {TABS.map(({ id, path, match, label, Icon }) => {
        const active = match(location.pathname);
        const hovered = tip?.id === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            aria-label={label}
            onClick={() => {
              if (!active) navigate(path);
            }}
            onMouseEnter={e => showTip(id, e.currentTarget, e.clientX)}
            onMouseMove={e => showTip(id, e.currentTarget, e.clientX)}
            onMouseLeave={() => setTip(null)}
            onFocus={e => showTip(id, e.currentTarget)}
            onBlur={() => setTip(null)}
            className={`rb-glow-hover h-8 w-8 inline-flex items-center justify-center rounded-full transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
              active
                ? 'bg-primary text-primary-foreground shadow-sm scale-105'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary active:scale-95'
            } ${hovered ? 'scale-[1.18]' : ''}`}
          >
            <Icon className="h-4 w-4" strokeWidth={active ? 2.4 : 2} />
          </button>
        );
      })}

      {/* Bulle de nom (portail → vrai verre dépoli sur le fond de l'app) */}
      {tip && current &&
        createPortal(
          <span
            aria-hidden
            className="pointer-events-none fixed z-[200]"
            style={{
              left: tip.x,
              top: tip.y + 10,
              transform: `translateX(calc(-50% + ${tip.dx * 12}px)) rotate(${tip.dx * 4}deg)`,
              transition: 'transform 140ms ease-out',
            }}
          >
            <span key={tip.id} className="rb-tip rb-liquid inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[12px] font-semibold whitespace-nowrap text-foreground">
              <current.Icon className="h-3.5 w-3.5 text-primary" strokeWidth={2.4} />
              {current.label}
            </span>
          </span>,
          document.body,
        )}
    </div>
  );
}
