/** Styles partagés du menu en pilule (Track Record + My Finance + Habitudes). Source unique : modifie ici. */

/** Hauteur commune du sélecteur de modules et de la pilule de menu. */
export const NAV_HEIGHT = 56;

export const NAV_PILL =
  'pointer-events-auto flex items-center gap-1 h-[56px] px-2 rounded-full bg-card border border-border shadow-[var(--shadow-card)] max-w-full min-w-0';

export const navItemClass = (active: boolean) =>
  `flex items-center justify-center whitespace-nowrap px-3 2xl:px-5 h-10 rounded-full text-[13px] 2xl:text-[14px] font-medium transition-colors duration-150 ${
    active
      ? 'bg-accent text-accent-foreground font-semibold'
      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
  }`;

/** Barre d'en-tête : sélecteur de modules à gauche, menu CENTRÉ, colonne symétrique à droite. */
export const HEADER_BAR = 'sticky top-0 z-50 bg-background/85 backdrop-blur-md';
export const HEADER_GRID =
  'grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 md:px-6 py-3 max-w-[1800px] mx-auto';
