export default function SmoothChartCursor({ points }: { points?: { x: number; y: number }[] }) {
  if (!points || points.length < 2) return null;
  return <line className="chart-motion-cursor" x1={0} x2={0} y1={points[0].y} y2={points[1].y} stroke="hsl(var(--muted-foreground) / 0.25)" strokeWidth={1} style={{ transform: `translateX(${points[0].x}px)`, pointerEvents: 'none' }} />;
}
