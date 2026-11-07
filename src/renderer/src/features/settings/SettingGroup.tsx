import type { ReactNode } from 'react';

interface SettingGroupProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export default function SettingGroup({ title, description, children }: SettingGroupProps) {
  return (
    <section className="mb-10">
      <h2 className="text-[20px] font-semibold tracking-[-0.02em]">{title}</h2>
      {description && <p className="mt-1 text-[14px] text-mute">{description}</p>}
      <div className="mt-2 border-t border-line">{children}</div>
    </section>
  );
}
