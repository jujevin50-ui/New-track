import { useEffect, useRef } from 'react';
import { noise2D } from '@/lib/flowNoise';

interface Props {
  color: string;
  variant?: 'page' | 'menu' | 'panel';
  density?: number;
  speed?: number;
  intensity?: number;
}
interface Particle { x: number; y: number; vx: number; vy: number; age: number; life: number; color: number; speed: number }

/** Canvas adaptation of the Lightswind Vector Flow field; see public/licenses. */
export default function KineticFlowField({ color, variant = 'page', density = 1, speed = 1, intensity = 0.4 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const host = ref.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;
    let context: CanvasRenderingContext2D | null;
    try { context = canvas.getContext('2d'); } catch { return; }
    if (!context) return;
    const ctx = context;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const dark = () => document.documentElement.classList.contains('dark');
    let isDark = dark();
    let width = 0, height = 0, clock = 0, frame = 0, last = 0;
    let inView = true, disposed = false;
    let particles: Particle[] = [];
    const mouse = { x: 0, y: 0, active: false };
    const base = /^#[0-9a-f]{6}$/i.test(color) ? color : '#38bdf8';
    const palette = [base, '#38bdf8', '#a78bfa'];
    const rgb = palette.map(hex => [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16)));
    const spawn = (): Particle => {
      const life = 200 + Math.random() * 250;
      return { x: Math.random() * width, y: Math.random() * height, vx: 0, vy: 0, age: Math.random() * life, life, color: Math.floor(Math.random() * 3), speed: 0.6 + Math.random() };
    };
    const draw = (step: number) => {
      clock += step * speed / 30;
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0,0,0,0.035)';
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = isDark ? 'screen' : 'source-over';
      const batches: number[][] = Array.from({ length: 9 }, () => []);
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const oldX = p.x, oldY = p.y;
        const qx = noise2D(p.x * 0.0025 + 1.2, p.y * 0.0025 + clock * 0.04);
        const qy = noise2D(p.x * 0.0025 + 5.7, p.y * 0.0025 + clock * 0.04);
        const angle = noise2D(p.x * 0.0018 + qx * 0.35, p.y * 0.0018 + qy * 0.35 + clock * 0.05) * Math.PI * 2.5;
        let fx = Math.cos(angle) * p.speed * speed;
        let fy = Math.sin(angle) * p.speed * speed * (variant === 'menu' ? 0.3 : 1);
        if (mouse.active) {
          const dx = mouse.x - p.x, dy = mouse.y - p.y;
          const distance = Math.hypot(dx, dy);
          if (distance > 1 && distance < 140) {
            const force = Math.pow(1 - distance / 140, 1.5) * p.speed * 3;
            fx -= dy / distance * force;
            fy += dx / distance * force;
          }
        }
        p.vx += (fx - p.vx) * Math.min(1, 0.09 * step);
        p.vy += (fy - p.vy) * Math.min(1, 0.09 * step);
        p.x += p.vx * step; p.y += p.vy * step; p.age += step;
        if (p.age >= p.life) { particles[i] = spawn(); continue; }
        if (p.x < 0 || p.x > width || p.y < 0 || p.y > height) {
          p.x = (p.x + width) % width; p.y = (p.y + height) % height;
          continue;
        }
        const alpha = Math.sin(p.age / p.life * Math.PI);
        const bucket = Math.min(2, Math.floor(alpha * 3));
        batches[p.color * 3 + bucket].push(oldX, oldY, p.x, p.y);
      }
      // Batch each color and opacity band instead of issuing three strokes per particle.
      batches.forEach((segments, index) => {
        if (!segments.length) return;
        const channel = rgb[Math.floor(index / 3)];
        const tint = `rgb(${channel.map(value => Math.round(value * (isDark ? 1 : 0.65))).join(',')})`;
        const alpha = [0.2, 0.5, 0.85][index % 3];
        ctx.beginPath();
        for (let i = 0; i < segments.length; i += 4) { ctx.moveTo(segments[i], segments[i + 1]); ctx.lineTo(segments[i + 2], segments[i + 3]); }
        ctx.strokeStyle = tint; ctx.lineWidth = 3.2; ctx.globalAlpha = alpha * 0.12; ctx.stroke();
        ctx.lineWidth = 1.1; ctx.globalAlpha = alpha * 0.75; ctx.stroke();
        ctx.strokeStyle = isDark ? '#ffffff' : tint; ctx.lineWidth = 0.45; ctx.globalAlpha = alpha * 0.5; ctx.stroke();
      });
      ctx.globalAlpha = 1;
    };
    const animate = (now: number) => {
      frame = 0;
      if (disposed || !inView || document.hidden || motion.matches) return;
      if (now - last >= 32) { draw(Math.min(2, Math.max(0.25, (now - last) / 33.33))); last = now; }
      frame = requestAnimationFrame(animate);
    };
    const schedule = () => {
      cancelAnimationFrame(frame); frame = 0;
      if (disposed) return;
      if (motion.matches) {
        for (let i = 0; i < 10; i++) draw(1);
        canvas.dataset.motion = 'reduced';
      } else if (inView && !document.hidden && width && height) {
        canvas.dataset.motion = 'running'; last = performance.now(); frame = requestAnimationFrame(animate);
      } else { canvas.dataset.motion = 'paused'; }
    };
    const resize = () => {
      const rect = host.getBoundingClientRect();
      const oldWidth = width || rect.width, oldHeight = height || rect.height;
      width = rect.width; height = rect.height;
      if (!width || !height) { schedule(); return; }
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5, Math.sqrt(2_000_000 / (width * height)));
      canvas.width = Math.max(1, Math.round(width * ratio)); canvas.height = Math.max(1, Math.round(height * ratio));
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      particles.forEach(p => { p.x *= width / oldWidth; p.y *= height / oldHeight; });
      const count = variant === 'menu' ? Math.min(120, Math.max(30, width * 0.18)) : Math.min(850, Math.max(150, width * height / 2000 * density));
      particles = particles.slice(0, Math.round(count));
      while (particles.length < Math.round(count)) particles.push(spawn());
      for (let i = 0; i < 12; i++) draw(1);
      schedule();
    };
    const pointer = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || motion.matches) return;
      const rect = host.getBoundingClientRect();
      mouse.x = event.clientX - rect.left; mouse.y = event.clientY - rect.top;
      mouse.active = mouse.x >= 0 && mouse.x <= width && mouse.y >= 0 && mouse.y <= height;
    };
    const leave = () => { mouse.active = false; };
    const theme = new MutationObserver(() => {
      if (dark() !== isDark) { isDark = dark(); ctx.clearRect(0, 0, width, height); schedule(); }
    });
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    const visibility = new IntersectionObserver(entries => { inView = entries[0].isIntersecting; schedule(); });
    visibility.observe(host);
    window.addEventListener('pointermove', pointer, { passive: true });
    window.addEventListener('pointerleave', leave);
    document.addEventListener('visibilitychange', schedule);
    motion.addEventListener('change', schedule);
    resize();
    return () => {
      disposed = true; cancelAnimationFrame(frame); observer.disconnect(); visibility.disconnect(); theme.disconnect();
      window.removeEventListener('pointermove', pointer); window.removeEventListener('pointerleave', leave);
      document.removeEventListener('visibilitychange', schedule); motion.removeEventListener('change', schedule);
    };
  }, [color, variant, density, speed]);

  return <div ref={ref} className="kinetic-flow-layer" aria-hidden="true" style={{ opacity: intensity }}><canvas ref={canvasRef} data-flow-field={variant} /></div>;
}
