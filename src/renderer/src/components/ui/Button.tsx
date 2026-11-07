import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'quiet' | 'danger';
  size?: 'sm' | 'md';
}

const VARIANTS = {
  primary: 'bg-accent text-white hover:brightness-110',
  quiet: 'bg-fill text-ink hover:brightness-95',
  danger: 'bg-fill text-danger hover:brightness-95',
} as const;

export default function Button({
  variant = 'quiet',
  size = 'md',
  className,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'no-drag inline-flex items-center justify-center gap-2 rounded-full font-medium transition disabled:opacity-40 disabled:pointer-events-none',
        size === 'sm' ? 'h-8 px-3.5 text-[13px]' : 'h-10 px-5 text-sm',
        VARIANTS[variant],
        className,
      )}
      {...rest}
    />
  );
}
