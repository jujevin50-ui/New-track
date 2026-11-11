/** Choose black or white by relative luminance, rather than by theme mode. */
export function foregroundForHsl(hue: number, saturation: number, lightness: number): string {
  const h = ((hue % 360) + 360) % 360 / 60;
  const s = Math.max(0,Math.min(100,saturation))/100;
  const l = Math.max(0,Math.min(100,lightness))/100;
  const chroma = (1-Math.abs(2*l-1))*s;
  const x = chroma*(1-Math.abs(h%2-1));
  const rgb = h<1?[chroma,x,0]:h<2?[x,chroma,0]:h<3?[0,chroma,x]:h<4?[0,x,chroma]:h<5?[x,0,chroma]:[chroma,0,x];
  const offset=l-chroma/2;
  const linear=rgb.map(value=>{const v=value+offset;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});
  const luminance=.2126*linear[0]+.7152*linear[1]+.0722*linear[2];
  return (luminance+.05)/.05 >= 1.05/(luminance+.05) ? '0 0% 0%' : '0 0% 100%';
}
