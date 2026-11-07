import { useEffect } from 'react';
import { useAlarmsStore } from '@/stores/useAlarmsStore';
import { startAlarmTone } from '@/features/voice/audio/cues';
import Button from '@/components/ui/Button';

export default function AlarmRingOverlay() {
  const ringing = useAlarmsStore((s) => s.ringing);
  const active = ringing.length > 0;

  useEffect(() => {
    if (!active) return undefined;
    return startAlarmTone();
  }, [active]);

  if (!active) return null;
  const current = ringing[0]!.alarm;
  const isTimer = current.kind === 'timer';

  return (
    <div
      role="alertdialog"
      aria-label="Alarm"
      className="no-drag fixed inset-0 z-50 grid place-items-center bg-paper/80 backdrop-blur-xl"
    >
      <div className="w-[360px] rounded-[28px] bg-surface p-8 text-center shadow-[0_20px_60px_rgba(0,0,0,0.15)]">
        <p className="text-[13px] font-medium text-mute">{isTimer ? 'Timer finished' : 'Alarm'}</p>
        <p className="mt-2 text-[34px] leading-tight font-semibold tracking-[-0.03em]">{current.label}</p>
        <div className="mt-8 flex justify-center gap-3">
          <Button onClick={() => void window.api.alarms.snooze(current.id, 5)}>Snooze 5 min</Button>
          <Button variant="primary" onClick={() => void window.api.alarms.dismiss(current.id)}>
            Stop
          </Button>
        </div>
      </div>
    </div>
  );
}
