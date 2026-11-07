import type { Alarm, AlarmInput } from '@shared/types';
import { useAlarmsStore } from '@/stores/useAlarmsStore';
import { useUiStore } from '@/stores/useUiStore';
import ViewFrame from '@/components/layout/ViewFrame';
import AlarmForm from './AlarmForm';
import AlarmRow from './AlarmRow';
import ClockCard from './ClockCard';

export default function AlarmsView() {
  const alarms = useAlarmsStore((s) => s.alarms);
  const notify = (e: unknown): void =>
    useUiStore
      .getState()
      .pushEntry({ role: 'notice', text: e instanceof Error ? e.message : 'That did not work.' });

  const create = async (input: AlarmInput): Promise<void> => {
    try {
      await window.api.alarms.create(input);
    } catch (e) {
      notify(e);
    }
  };
  const toggle = (a: Alarm, enabled: boolean): void =>
    void window.api.alarms.toggle(a.id, enabled).catch(notify);
  const remove = (a: Alarm): void => void window.api.alarms.remove(a.id).catch(notify);

  return (
    <ViewFrame title="Clock" subtitle="Alarms and timers keep running while the window is closed.">
      <div className="max-w-2xl">
        <ClockCard />
        <AlarmForm onCreate={create} />
        <ul>
          {alarms.map((a) => (
            <AlarmRow key={a.id} alarm={a} onToggle={toggle} onRemove={remove} />
          ))}
        </ul>
        {alarms.length === 0 && (
          <p className="py-8 text-[15px] text-mute">No alarms yet. You can also say “wake me at 6:30”.</p>
        )}
      </div>
    </ViewFrame>
  );
}
