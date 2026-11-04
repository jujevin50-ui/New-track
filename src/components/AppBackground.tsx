import { FlowSurface } from './FlowSurface';

/** One ambient field behind all pages; the document readers keep their own background. */
export function AppBackground() {
  return <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true" style={{ background: 'hsl(var(--background))' }}><FlowSurface variant="page" /></div>;
}
