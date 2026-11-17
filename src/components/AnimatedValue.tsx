import { useContext } from 'react';
import { NumberAnimationContext } from '@/contexts/NumberAnimationContext';
import { useCountUp } from '@/hooks/useCountUp';


/** Animate formatted KPI values while keeping their currency, sign and precision. */
export function AnimatedValue({ value, locale = 'fr-FR' }: { value: string; locale?: 'fr-FR' | 'en-US' }) {
  return <Value key={`${locale}:${value}`} value={value} locale={locale} />;
}
function Value({ value, locale }: { value: string; locale: 'fr-FR' | 'en-US' }) {
  const enabled = useContext(NumberAnimationContext);
  const progress = useCountUp(1, 1100, 0, enabled);
  const text = progress === 1 ? value : value.replace(/\d(?:[\d.,\u00a0\u202f ]*\d)?/g, token => {
    const decimal = locale === 'fr-FR' ? ',' : '.';
    const parts = token.split(decimal);
    const precision = parts.length > 1 ? parts.at(-1)!.length : 0;
    const normalized = locale === 'fr-FR' ? token.replace(/[.\s\u00a0\u202f]/g, '').replace(',', '.') : token.replace(/[,\s\u00a0\u202f]/g, '');
    const number = Number(normalized);
    if (!Number.isFinite(number)) return token;
    return (number * progress).toLocaleString(locale, { minimumFractionDigits: Math.min(precision, 20), maximumFractionDigits: Math.min(precision, 20), useGrouping: /[,\s\u00a0\u202f]/.test(parts[0]) });
  });
  return <span className="tabular-nums" aria-label={value}><span aria-hidden="true">{text}</span></span>;
}
