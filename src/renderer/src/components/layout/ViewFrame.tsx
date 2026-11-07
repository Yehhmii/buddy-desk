import type { ReactNode } from 'react';

interface ViewFrameProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export default function ViewFrame({ title, subtitle, actions, children }: ViewFrameProps) {
  return (
    <section className="flex h-full min-w-0 flex-1 flex-col pt-12">
      <header className="flex items-end justify-between gap-6 px-10 pb-6">
        <div>
          <h1 className="text-[34px] leading-tight font-semibold tracking-[-0.03em]">{title}</h1>
          {subtitle && <p className="mt-1 text-[15px] text-mute">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </header>
      <div className="scroll-y min-h-0 flex-1 px-10 pb-10">{children}</div>
    </section>
  );
}
