import { Search } from 'lucide-react';

interface Props {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export function SearchField({ label, value, onChange }: Props) {
  return <label className="lumar-search">
    <Search size={18} aria-hidden="true"/>
    <input type="search" aria-label={label} placeholder={label} value={value}
      onChange={event => onChange(event.target.value)}/>
  </label>;
}
