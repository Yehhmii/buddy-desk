import { cn } from '@/lib/cn';
import Icon, { type IconName } from '@/components/ui/Icon';
import { useUiStore, type View } from '@/stores/useUiStore';

const ITEMS: ReadonlyArray<{ view: View; label: string; icon: IconName }> = [
  { view: 'today', label: 'Today', icon: 'today' },
  { view: 'alarms', label: 'Clock', icon: 'alarm' },
  { view: 'report', label: 'Report', icon: 'report' },
  { view: 'settings', label: 'Settings', icon: 'settings' },
];

export default function Sidebar() {
  const view = useUiStore((s) => s.view);
  const setView = useUiStore((s) => s.setView);

  return (
    <nav aria-label="Main" className="no-drag flex w-[84px] shrink-0 flex-col items-center gap-1 pt-14 pb-6">
      {ITEMS.map((item) => {
        const active = item.view === view;
        return (
          <button
            key={item.view}
            type="button"
            onClick={() => setView(item.view)}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex w-16 flex-col items-center gap-1 rounded-2xl py-2.5 text-[11px] font-medium transition',
              active ? 'bg-accent-soft text-accent' : 'text-mute hover:text-ink',
            )}
          >
            <Icon name={item.icon} />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
