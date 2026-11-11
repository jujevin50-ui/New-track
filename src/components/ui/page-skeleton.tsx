import { Skeleton } from './skeleton';

/** Stable dimensions prevent a spinner from collapsing the entire workspace. */
export function PageSkeleton() {
  return <div className="ui-page-loader w-full space-y-8" role="status" aria-label="Chargement de la page">
    <span className="sr-only">Chargement de la page…</span>
    <div className="flex flex-wrap gap-4"><Skeleton className="h-11 w-[240px] max-w-full" /><Skeleton className="h-11 w-[180px] max-w-full" /></div>
    <div className="grid grid-cols-2 gap-6 md:grid-cols-4">{Array.from({length:4},(_,i)=><div key={i} className="space-y-4"><Skeleton className="h-3 w-24 max-w-full" /><Skeleton className="h-8 w-32 max-w-full" /></div>)}</div>
    <Skeleton className="h-[300px] w-full" />
  </div>;
}
