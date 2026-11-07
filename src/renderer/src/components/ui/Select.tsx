import type { SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  options: ReadonlyArray<{ value: string; label: string }>;
  onChange: (value: string) => void;
}

export default function Select({ options, onChange, className, ...rest }: SelectProps) {
  return (
    <select
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        'no-drag h-9 rounded-control bg-fill px-3 text-sm text-ink outline-none focus:ring-2 focus:ring-accent/40',
        className,
      )}
      {...rest}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
