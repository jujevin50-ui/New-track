import { describe, expect, it } from 'vitest';
import { foregroundForHsl } from './colorContrast';

describe('readable accent labels',()=>{
  it('uses dark text on very light, yellow and saturated green accents',()=>{
    expect(foregroundForHsl(0,0,95)).toBe('0 0% 0%');
    expect(foregroundForHsl(45,90,50)).toBe('0 0% 0%');
    expect(foregroundForHsl(150,65,45)).toBe('0 0% 0%');
  });
  it('uses white on deep violet and charcoal',()=>{
    expect(foregroundForHsl(270,70,30)).toBe('0 0% 100%');
    expect(foregroundForHsl(0,0,32)).toBe('0 0% 100%');
  });
  it('treats wrapped hue values consistently',()=>expect(foregroundForHsl(-90,70,30)).toBe(foregroundForHsl(270,70,30)));
});
