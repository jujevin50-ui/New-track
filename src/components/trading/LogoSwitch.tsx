import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface LogoSwitchProps {
  /** Position fixe en haut à gauche, identique dans toutes les vues (Track Record et My Finance) */
  floating?: boolean;
  /** Classes supplémentaires */
  className?: string;
  /** Taille du logo en px */
  size?: number;
}

// Source unique de la position du logo : modifie ici pour le déplacer partout.
const FLOATING_CLASS = 'fixed top-4 left-6 z-50 h-[60px] w-[60px]';

const SPIN_MS = 600;

/**
 * Logo de l'app qui sert de bouton de bascule entre Track Record ("/") et My Finance ("/finance").
 * Au clic : le logo fait un tour complet (360°), puis la vue change.
 * Comme 360° = 0°, la transition est invisible quand le composant est remonté dans l'autre vue.
 */
export function LogoSwitch({ floating = false, className = '', size = 38 }: LogoSwitchProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [spinning, setSpinning] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const isFinance = location.pathname === '/finance';

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const handleClick = () => {
    if (spinning) return;
    const target = isFinance ? '/' : '/finance';
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) { navigate(target); return; }
    setSpinning(true);
    timer.current = setTimeout(() => navigate(target), SPIN_MS);
  };

  const label = isFinance ? 'Retour au Track Record' : 'Ouvrir My Finance';

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={label}
      title={label}
      className={`flex items-center justify-center rounded-full bg-card/95 backdrop-blur-sm border border-border/60 shadow-[0_8px_24px_rgba(0,0,0,0.15)] hover:border-primary/50 active:scale-95 transition-[border-color,transform] ${floating ? FLOATING_CLASS : ''} ${className}`}
    >
      <img
        src="/logo.png"
        alt=""
        draggable={false}
        className="object-contain select-none pointer-events-none"
        style={{
          width: size,
          height: size,
          transform: `rotate(${spinning ? 360 : 0}deg)`,
          transition: spinning ? `transform ${SPIN_MS}ms cubic-bezier(0.45, 0, 0.2, 1)` : 'none',
        }}
      />
    </button>
  );
}
