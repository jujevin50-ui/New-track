// Génère des ticks "ronds" pour un axe Y entre min et max.
// Choisit un pas (step) basé sur la magnitude de l'amplitude pour donner
// 4-7 ticks alignés sur des chiffres ronds (1, 2, 5, 10, 20, 50, 100…).
export const niceStep = (range: number): number => {
  if (range <= 0) return 1;
  const targetSteps = 5;
  const rough = range / targetSteps;
  const mag = Math.pow(10, Math.floor(Math.log10(rough)));
  const norm = rough / mag;
  let nice: number;
  if (norm < 1.5) nice = 1;
  else if (norm < 3) nice = 2;
  else if (norm < 7) nice = 5;
  else nice = 10;
  return nice * mag;
};

export const niceTicks = (min: number, max: number): number[] => {
  if (!isFinite(min) || !isFinite(max) || min === max) return [min];
  const step = niceStep(max - min);
  const start = Math.floor(min / step) * step;
  const end = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  // Limiter pour éviter explosion
  const maxTicks = 12;
  for (let i = 0, v = start; v <= end + 1e-9 && i < maxTicks; v += step, i++) {
    // Arrondit pour éviter 0.30000000004
    ticks.push(Math.round(v * 1e6) / 1e6);
  }
  return ticks;
};

export const niceDomain = (min: number, max: number): [number, number] => {
  if (min === max) return [min - 1, max + 1];
  const step = niceStep(max - min);
  return [Math.floor(min / step) * step, Math.ceil(max / step) * step];
};
