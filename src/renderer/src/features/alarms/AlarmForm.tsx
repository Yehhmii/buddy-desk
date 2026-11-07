import { useState } from 'react';
import { cn } from '@/lib/cn';
import Button from '@/components/ui/Button';
import TextField from '@/components/ui/TextField';

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const TIMER_PRESETS = [5, 10, 25, 45];

interface AlarmFormProps {
  onCreate: (input: {
    time?: string;
    inMinutes?: number;
    label?: string;
    repeatDays?: number[];
  }) => Promise<void>;
}

export default function AlarmForm({ onCreate }: AlarmFormProps) {
  const [time, setTime] = useState('07:00');
  const [label, setLabel] = useState('');
  const [days, setDays] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<void>): Promise<void> => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  const toggleDay = (d: number): void =>
    setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));

  return (
    <div className="space-y-5 border-b border-line pb-8">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          aria-label="Alarm time"
          className="no-drag h-10 rounded-control bg-fill px-3 text-[15px] tabular-nums outline-none focus:ring-2 focus:ring-accent/40"
        />
        <TextField
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Label (optional)"
          maxLength={80}
          aria-label="Alarm label"
          className="max-w-56"
        />
        <Button
          variant="primary"
          disabled={busy || !time}
          onClick={() =>
            void run(async () => {
              await onCreate({ time, label: label || undefined, repeatDays: days });
              setLabel('');
            })
          }
        >
          Set alarm
        </Button>
      </div>
      <div className="flex items-center gap-1.5" role="group" aria-label="Repeat on">
        {DAYS.map((d, i) => (
          <button
            key={i}
            type="button"
            aria-pressed={days.includes(i)}
            onClick={() => toggleDay(i)}
            className={cn(
              'no-drag size-8 rounded-full text-[12px] font-medium transition',
              days.includes(i) ? 'bg-accent text-white' : 'bg-fill text-mute hover:text-ink',
            )}
          >
            {d}
          </button>
        ))}
        <span className="ml-2 text-[13px] text-mute">{days.length === 0 ? 'Rings once' : 'Repeats'}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-[13px] text-mute">Timer</span>
        {TIMER_PRESETS.map((m) => (
          <Button
            key={m}
            size="sm"
            disabled={busy}
            onClick={() => void run(() => onCreate({ inMinutes: m }))}
          >
            {m} min
          </Button>
        ))}
      </div>
    </div>
  );
}
