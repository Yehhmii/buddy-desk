import type { ReactNode } from 'react';

interface SettingRowProps {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
}

export default function SettingRow({ label, hint, children }: SettingRowProps) {
  return (
    <div className="flex items-center justify-between gap-8 border-b border-line py-4 last:border-b-0">
      <div className="min-w-0">
        <p className="text-[15px]">{label}</p>
        {hint && <p className="mt-0.5 text-[13px] leading-snug text-mute">{hint}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-3">{children}</div>
    </div>
  );
}
