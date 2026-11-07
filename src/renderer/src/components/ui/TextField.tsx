import type { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export default function TextField({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'no-drag h-10 w-full rounded-control bg-fill px-3.5 text-sm text-ink placeholder:text-mute outline-none focus:ring-2 focus:ring-accent/40',
        className,
      )}
      {...rest}
    />
  );
}
