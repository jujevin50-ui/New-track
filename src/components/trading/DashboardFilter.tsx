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
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger aria-label={ariaLabel} className="dashboard-filter-trigger">
        <span className="dashboard-filter-copy">
          <span className="dashboard-filter-caption">{label}</span>
          <span className="dashboard-filter-value"><SelectValue placeholder="Aucun compte" /></span>
        </span>
      </SelectTrigger>
      <SelectContent className="dashboard-filter-menu" sideOffset={6} align="start">
        <SelectGroup>
          <SelectLabel className="dashboard-filter-menu-label">{label}</SelectLabel>
          {options.map(option => (
            <SelectItem key={option.value} value={option.value} className="dashboard-filter-option">{option.label}</SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
