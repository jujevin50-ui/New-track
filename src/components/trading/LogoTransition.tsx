import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

/* Transition "logo" entre Track Record ("/") et My Finance ("/finance") :
   1. le logo tourne vite en grandissant jusqu'à couvrir TOUTE la page ;
   2. la page change derrière lui ;
   3. il continue de tourner en rétrécissant vers le centre, ce qui dévoile la nouvelle page. */

export interface LogoRect { x: number; y: number; w: number; h: number }

interface Ctx {
  /** true pendant toute la transition (le logo d'origine se masque pour ne pas faire doublon) */
  active: boolean;
  start: (from: LogoRect, target: string) => void;
}

const LogoTransitionContext = createContext<Ctx | null>(null);
export const useLogoTransition = () => useContext(LogoTransitionContext);

type Phase = 'start' | 'cover' | 'reveal' | 'leave';

const COVER_MS = 600;    // le logo grandit et prend toute la page (rotation rapide, qui accélère)
const HOLD_MS = 110;     // la nouvelle page se monte derrière le logo plein écran
const REVEAL_MS = 780;   // le logo rétrécit vers le centre en tournant et dévoile la page
const LEAVE_MS = 240;    // dernier effet : le logo se résorbe au centre
const TURNS_COVER = 3;   // tours pendant la prise de la page
const TURNS_REVEAL = 3;  // tours pendant le rétrécissement
const END_SIZE = 170;    // taille du logo (px) quand il arrive au centre

// Précharge le logo HD utilisé en plein écran
if (typeof window !== 'undefined') { const i = new Image(); i.src = '/logo-large.png'; }

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
    requestAnimationFrame(() => requestAnimationFrame(() => setState(s => (s ? { ...s, phase: 'cover' } : s))));

    const minDelay = new Promise<void>(res => timers.current.push(setTimeout(res, COVER_MS)));
    // La page ne change qu'une fois le logo plein écran ET la page cible prête
    Promise.all([minDelay, preload(target)]).then(() => {
      navigate(target);
      timers.current.push(setTimeout(() => {
        setState(s => (s ? { ...s, phase: 'reveal' } : s));
        timers.current.push(setTimeout(() => {
          setState(s => (s ? { ...s, phase: 'leave' } : s));
          timers.current.push(setTimeout(() => { setState(null); busy.current = false; }, LEAVE_MS));
        }, REVEAL_MS));
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
  const dx = vw / 2 - (from.x + from.w / 2);
  const dy = vh / 2 - (from.y + from.h / 2);

  // Plein écran : le logo (avec ses vides) doit couvrir toute la page, même en tournant.
  const coverSize = Math.min(Math.hypot(vw, vh) * 1.7, 4200);
  const sBig = coverSize / from.w;
  const sSmall = END_SIZE / from.w;

  const centered = `translate(${dx}px, ${dy}px)`;
  const transform =
    phase === 'start' ? 'translate(0px, 0px) scale(1) rotate(0deg)'
    : phase === 'cover' ? `${centered} scale(${sBig}) rotate(${TURNS_COVER * 360}deg)`
    : phase === 'reveal' ? `${centered} scale(${sSmall}) rotate(${(TURNS_COVER + TURNS_REVEAL) * 360}deg)`
    : `${centered} scale(${sSmall * 0.3}) rotate(${(TURNS_COVER + TURNS_REVEAL) * 360 + 180}deg)`;

  const imgTransition =
    phase === 'cover' ? `transform ${COVER_MS}ms cubic-bezier(0.55, 0, 0.9, 0.6)`          // accélère jusqu'au plein écran
    : phase === 'reveal' ? `transform ${REVEAL_MS}ms cubic-bezier(0.1, 0.55, 0.25, 1)`      // part vite, ralentit au centre
    : phase === 'leave' ? `transform ${LEAVE_MS}ms ease-in, opacity ${LEAVE_MS}ms ease-in`
    : 'none';

  // Voile sombre : se referme vite pendant la prise de la page, se lève pendant le rétrécissement.
  const veilOpacity = phase === 'cover' ? 1 : 0;
  const veilTransition =
    phase === 'cover' ? `opacity ${COVER_MS * 0.45}ms ease-out`
    : phase === 'reveal' ? `opacity ${REVEAL_MS * 0.7}ms ease-in-out ${REVEAL_MS * 0.12}ms`
    : 'none';

  // Fond aux couleurs du logo : comble les creux quand le logo est plein écran (plus aucune zone noire),
  // puis se dissipe pendant le rétrécissement.
  const washOpacity = phase === 'cover' ? 0.85 : 0;
  const washTransition =
    phase === 'cover' ? `opacity ${COVER_MS * 0.5}ms ease-in ${COVER_MS * 0.45}ms`
    : phase === 'reveal' ? `opacity ${REVEAL_MS * 0.55}ms ease-out`
    : 'none';

  return (
    <div className="fixed inset-0 z-[200] pointer-events-auto overflow-hidden" aria-hidden>
      <div className="absolute inset-0" style={{ background: 'hsl(var(--background))', opacity: veilOpacity, transition: veilTransition }} />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #ff8a2a 0%, #d6243a 28%, #8b2fc9 62%, #3b6fe0 100%)', opacity: washOpacity, transition: washTransition }} />
      <img
        src="/logo-large.png"
        onError={e => { const el = e.currentTarget; if (!el.src.endsWith('/logo.png')) el.src = '/logo.png'; }}
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
          opacity: phase === 'leave' ? 0 : 1,
          transition: imgTransition,
          willChange: 'transform',
        }}
      />
    </div>
  );
}
