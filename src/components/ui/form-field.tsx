import { useId, type ReactNode } from 'react';
import { CircleAlert } from 'lucide-react';
import { Label } from './label';

interface FieldControlProps { id: string; 'aria-invalid'?: true; 'aria-describedby'?: string; }

/** Associates a visible label and actionable error with either a native or Radix control. */
export function FormField({ label, error, required, children }: {
  label: string; error?: string; required?: boolean; children: (props: FieldControlProps) => ReactNode;
}) {
  const id = useId();
  return <div className="min-w-0 space-y-2">
    <Label htmlFor={id}>{label}{required && <span className="sr-only"> (obligatoire)</span>}</Label>
    {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': error ? `${id}-error` : undefined })}
    {error && <p id={`${id}-error`} className="ui-field-error" role="alert"><CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />{error}</p>}
  </div>;
}
