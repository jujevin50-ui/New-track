import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

/* Transition "logo" entre Track Record ("/") et My Finance ("/finance") :
   le logo quitte sa place, grandit jusqu'au centre de l'écran en tournant, la page change
   derrière le voile, puis le voile se lève et la nouvelle page apparaît. */

export interface LogoRect { x: number; y: number; w: number; h: number }

interface Ctx {
  /** true pendant toute la transition (le logo d'origine se masque pour ne pas faire doublon) */
  active: boolean;
  start: (from: LogoRect, target: string) => void;
}

const LogoTransitionContext = createContext<Ctx | null>(null);
export const useLogoTransition = () => useContext(LogoTransitionContext);

type Phase = 'start' | 'grow' | 'out';

const GROW_MS = 950;   // le logo grandit, tourne et se centre
const HOLD_MS = 320;   // la page se monte derrière le voile
const OUT_MS = 520;    // le voile se lève
const TURNS = 2;       // nombre de tours pendant la transition

/** Précharge la page cible pendant l'animation pour qu'elle apparaisse sans écran de chargement. */
const preload = (target: string) => {
  try {
    if (target === '/finance') return import('@/pages/Finance');
    if (target === '/') return import('@/pages/Dashboard');
  } catch { /* ignore */ }
  return Promise.resolve();
};

export function LogoTransitionProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [state, setState] = useState<{ phase: Phase; from: LogoRect; target: string } | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const busy = useRef(false);

  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  useEffect(() => clearTimers, []);

  const start = useCallback((from: LogoRect, target: string) => {
    if (busy.current) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { navigate(target); return; }

    busy.current = true;
    setState({ phase: 'start', from, target });
    // deux frames : le navigateur enregistre l'état de départ avant de lancer la transition
    requestAnimationFrame(() => requestAnimationFrame(() => setState(s => (s ? { ...s, phase: 'grow' } : s))));

    const minDelay = new Promise<void>(res => timers.current.push(setTimeout(res, GROW_MS)));
    Promise.all([minDelay, preload(target)]).then(() => {
      navigate(target);
      timers.current.push(setTimeout(() => {
        setState(s => (s ? { ...s, phase: 'out' } : s));
        timers.current.push(setTimeout(() => { setState(null); busy.current = false; }, OUT_MS));
      }, HOLD_MS));
    });
  }, [navigate]);

  const value = useMemo<Ctx>(() => ({ active: !!state, start }), [state, start]);

  return (
    <LogoTransitionContext.Provider value={value}>
      {children}
      {state && <Overlay {...state} />}
    </LogoTransitionContext.Provider>
  );
}

function Overlay({ phase, from }: { phase: Phase; from: LogoRect; target: string }) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  // taille finale : ~28 % du plus petit côté de l'écran (bornée)
  const finalSize = Math.max(140, Math.min(280, Math.min(vw, vh) * 0.28));
  const scale = finalSize / from.w;
  const dx = vw / 2 - (from.x + from.w / 2);
  const dy = vh / 2 - (from.y + from.h / 2);

  const grown = phase !== 'start';
  const leaving = phase === 'out';

  const transform = grown
    ? `translate(${dx}px, ${dy}px) scale(${leaving ? scale * 1.12 : scale}) rotate(${TURNS * 360}deg)`
    : 'translate(0px, 0px) scale(1) rotate(0deg)';

  return (
    <div
      className="fixed inset-0 z-[200] pointer-events-auto"
      style={{
        background: 'hsl(var(--background))',
        opacity: phase === 'start' ? 0 : leaving ? 0 : 1,
        transition: `opacity ${leaving ? OUT_MS : GROW_MS * 0.7}ms ease-in-out`,
      }}
      aria-hidden
    >
      <img
        src="/logo.png"
        alt=""
        draggable={false}
        style={{
          position: 'fixed',
          left: from.x,
          top: from.y,
          width: from.w,
          height: from.h,
          objectFit: 'contain',
          transformOrigin: 'center center',
          transform,
          opacity: leaving ? 0 : 1,
          transition: leaving
            ? `transform ${OUT_MS}ms ease-out, opacity ${OUT_MS}ms ease-in`
            : `transform ${GROW_MS}ms cubic-bezier(0.65, 0, 0.2, 1)`,
          filter: 'drop-shadow(0 12px 40px rgba(0,0,0,0.45))',
          willChange: 'transform',
        }}
      />
    </div>
  );
}
