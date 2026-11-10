import { useLayoutEffect, useRef } from 'react';

type Point = { node: SVGGElement; circle: SVGCircleElement; generation: number };
const pointsByChart = new WeakMap<SVGSVGElement, Map<string, Point>>();
const NS = 'http://www.w3.org/2000/svg';

/** Recharts remounts active dots per value. Keep their visual node stable to interpolate. */
export default function SmoothChartDot({ cx, cy, fill, dataKey }: { cx?: number; cy?: number; fill?: string; dataKey?: unknown }) {
  const anchor = useRef<SVGGElement>(null);
  useLayoutEffect(() => {
    const svg = anchor.current?.ownerSVGElement;
    if (!svg || cx == null || cy == null) return;
    let points = pointsByChart.get(svg);
    if (!points) { points = new Map(); pointsByChart.set(svg, points); }
    const key = String(dataKey ?? fill ?? 'point');
    let point = points.get(key);
    if (!point || !point.node.isConnected) {
      const node = document.createElementNS(NS, 'g');
      node.setAttribute('class', 'chart-motion-dot');
      node.setAttribute('aria-hidden', 'true');
      node.style.pointerEvents = 'none';
      const circle = document.createElementNS(NS, 'circle');
      circle.setAttribute('r', '4');
      circle.setAttribute('stroke', 'hsl(var(--background))');
      circle.setAttribute('stroke-width', '2');
      node.appendChild(circle);
      svg.appendChild(node);
      point = { node, circle, generation: 0 };
      points.set(key, point);
    }
    const generation = ++point.generation;
    point.circle.setAttribute('fill', fill || 'hsl(var(--primary))');
    point.node.style.transform = `translate(${cx}px, ${cy}px)`;
    return () => {
      // A replacement dot mounts in the same commit. Remove only when the pointer leaves.
      requestAnimationFrame(() => {
        if (point.generation === generation) { point.node.remove(); if (points.get(key) === point) points.delete(key); }
      });
    };
  }, [cx, cy, fill, dataKey]);
  return <g ref={anchor} />;
}
