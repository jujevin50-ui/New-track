import { useId } from 'react';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Props {
  label: string;
  ariaLabel: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
}

export default function DashboardFilter({ label, ariaLabel, value, onChange, options, disabled }: Props) {
  const id = useId();
  return (
    <div className={`dashboard-filter-field${label === 'Compte' ? ' dashboard-filter-account' : ''}`}><label htmlFor={id} className="dashboard-filter-caption">{label}</label><Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger id={id} aria-label={ariaLabel} className="dashboard-filter-trigger">
        <SelectValue placeholder="Aucun compte" />
      </SelectTrigger>
      <SelectContent className="dashboard-filter-menu" sideOffset={6} align="start">
        <SelectGroup>
          <SelectLabel className="dashboard-filter-menu-label">{label}</SelectLabel>
          {options.map(option => (
            <SelectItem key={option.value} value={option.value} className="dashboard-filter-option">{option.label}</SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select></div>
  );
}
