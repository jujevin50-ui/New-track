import { useCallback, useEffect, useRef, useState } from 'react';

/** Briefly show a successful write before leaving the form. */
export function useSaveConfirmation() {
  const [saved, setSaved] = useState(false);
  const timer = useRef<number>();
  const mounted = useRef(false);
  const reset = useCallback(() => {
    window.clearTimeout(timer.current);
    setSaved(false);
  }, []);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      window.clearTimeout(timer.current);
    };
  }, []);

  const confirm = (after?: () => void) => {
    if (!mounted.current) return;
    window.clearTimeout(timer.current);
    setSaved(true);
    timer.current = window.setTimeout(() => {
      setSaved(false);
      after?.();
    }, 650);
  };

  return { saved, confirm, reset };
}
