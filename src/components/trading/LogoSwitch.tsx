import { useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLogoTransition } from './LogoTransition';

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

/**
 * Logo de l'app qui sert de bouton de bascule entre Track Record ("/") et My Finance ("/finance").
 * Au clic : le logo grandit jusqu'au centre de l'écran en tournant, la vue change derrière,
 * puis la nouvelle page apparaît (voir LogoTransition).
 */
export function LogoSwitch({ floating = false, className = '', size = 38 }: LogoSwitchProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const transition = useLogoTransition();
  const imgRef = useRef<HTMLImageElement>(null);
  const isFinance = location.pathname === '/finance';

  const handleClick = () => {
    const target = isFinance ? '/' : '/finance';
    const img = imgRef.current;
    if (!transition || !img) { navigate(target); return; }
    const r = img.getBoundingClientRect();
    transition.start({ x: r.x, y: r.y, w: r.width, h: r.height }, target);
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
        ref={imgRef}
        src="/logo.png"
        alt=""
        draggable={false}
        className="object-contain select-none pointer-events-none"
        style={{ width: size, height: size, opacity: transition?.active ? 0 : 1 }}
      />
    </button>
  );
}
