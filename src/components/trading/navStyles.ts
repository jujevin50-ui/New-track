/** Styles partagés du menu en pilule (Track Record + My Finance). Source unique : modifie ici. */

/** Hauteur commune du sélecteur de modules et de la pilule de menu. */
export const NAV_HEIGHT = 40;

export const NAV_PILL =
  'pointer-events-auto flex flex-wrap items-center justify-center gap-0.5 min-h-[40px] h-auto py-1 px-1.5 rounded-2xl rb-liquid max-w-full';

export const navItemClass = (active: boolean) =>
  `flex items-center justify-center whitespace-nowrap px-2.5 2xl:px-4 h-8 rounded-full text-[12px] 2xl:text-[13px] font-medium transition-all duration-200 ${
    active
      ? 'selected-tab font-semibold'
      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
  }`;

/** Barre d'en-tête : sélecteur de modules à gauche, menu CENTRÉ, colonne symétrique à droite. */
/** Plus de fond ni de trait de séparation : les pilules flottent sur le fond de l'app. */
export const HEADER_BAR = 'sticky top-0 z-50 pointer-events-none';
export const HEADER_GRID =
  'app-header-grid grid items-center gap-3 px-3 md:px-5 py-3 max-w-[1800px] mx-auto';
