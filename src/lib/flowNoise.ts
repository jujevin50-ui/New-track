/*
 * Adapted from Lightswind UI Vector Flow by codewithMUHILAN (MIT).
 * Source: https://github.com/codewithMUHILAN/Lightswind-UI-Library
 * License: public/licenses/lightswind-vector-flow.txt
 */
// Classic 2D Perlin Noise Permutation Table Setup
const perm = new Uint8Array(512);
const grad2 = [
  [1, 1], [-1, 1], [1, -1], [-1, -1],
  [1, 0], [-1, 0], [0, 1], [0, -1]
];

const initNoise = () => {
  const p = Array.from({ length: 256 }, (_, i) => i);
  // Linear congruential generator for deterministic shuffle
  let seed = 42;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x80000000;
  };
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = p[i];
    p[i] = p[j];
    p[j] = tmp;
  }
  for (let i = 0; i < 512; i++) {
    perm[i] = p[i & 255];
  }
};
initNoise();

const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
const lerp = (t: number, a: number, b: number) => a + t * (b - a);

export const noise2D = (x: number, y: number) => {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  const xf = x - Math.floor(x);
  const yf = y - Math.floor(y);

  const u = fade(xf);
  const v = fade(yf);

  const aa = perm[perm[X] + Y];
  const ab = perm[perm[X] + Y + 1];
  const ba = perm[perm[X] + 1 + Y];
  const bb = perm[perm[X] + 1 + Y + 1];

  const g_aa = grad2[aa & 7];
  const g_ab = grad2[ab & 7];
  const g_ba = grad2[ba & 7];
  const g_bb = grad2[bb & 7];

  const n_aa = g_aa[0] * xf + g_aa[1] * yf;
  const n_ba = g_ba[0] * (xf - 1) + g_ba[1] * yf;
  const n_ab = g_ab[0] * xf + g_ab[1] * (yf - 1);
  const n_bb = g_bb[0] * (xf - 1) + g_bb[1] * (yf - 1);

  const x1 = lerp(u, n_aa, n_ba);
  const x2 = lerp(u, n_ab, n_bb);

  return lerp(v, x1, x2);
};

