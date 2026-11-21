import { Button } from './Button';

interface Props {
  label: string;
  value: string;
  options: readonly { id: string; label: string; href?: string }[];
  onChange?: (value: string) => void;
}

export function Segmented({ label, value, options, onChange }: Props) {
  return <div className="lumar-segmented" role="group" aria-label={label}>
    {options.map(option => option.href ? (
      <a key={option.id} href={option.href} className="button button--secondary lumar-link"
        aria-current={value === option.id ? 'page' : undefined}>{option.label}</a>
    ) : (
      <Button key={option.id} variant="secondary" aria-pressed={value === option.id}
        onClick={() => onChange?.(option.id)}>{option.label}</Button>
    ))}
  </div>;
}
