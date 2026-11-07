import { useEffect, useState } from 'react';
import { formatClockTime, formatHHMM } from '@shared/time';
import type { Alarm } from '@shared/types';
import { describeRepeat, formatCountdown } from '@/lib/format';
import Icon from '@/components/ui/Icon';
import Switch from '@/components/ui/Switch';

interface AlarmRowProps {
  alarm: Alarm;
  onToggle: (alarm: Alarm, enabled: boolean) => void;
  onRemove: (alarm: Alarm) => void;
}

export default function AlarmRow({ alarm, onToggle, onRemove }: AlarmRowProps) {
  const [now, setNow] = useState(Date.now());
  const isTimer = alarm.kind === 'timer';
  const live = isTimer && alarm.enabled && alarm.nextFireAt !== null;

  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [live]);

  const big = isTimer
    ? live
      ? formatCountdown((alarm.nextFireAt ?? now) - now)
      : 'Done'
    : alarm.time
      ? formatHHMM(alarm.time)
      : '';
  const sub = isTimer
    ? `${alarm.label}${alarm.nextFireAt ? `, rings ${formatClockTime(alarm.nextFireAt)}` : ''}`
    : `${alarm.label !== formatHHMM(alarm.time ?? '') ? `${alarm.label}, ` : ''}${describeRepeat(alarm.repeatDays)}`;

  return (
    <li className="group flex items-center gap-5 border-b border-line py-4">
      <div className="min-w-0 flex-1">
        <p
          className={`text-[30px] leading-none font-light tracking-[-0.03em] tabular-nums ${alarm.enabled ? '' : 'text-mute'}`}
        >
          {big}
        </p>
        <p className="mt-1.5 truncate text-[13px] text-mute">{sub}</p>
      </div>
      <button
        type="button"
        onClick={() => onRemove(alarm)}
        aria-label={`Delete ${alarm.label}`}
        className="no-drag grid size-8 place-items-center rounded-full text-mute opacity-0 transition group-hover:opacity-100 hover:text-danger focus-visible:opacity-100"
      >
        <Icon name="trash" size={17} />
      </button>
      <Switch
        checked={alarm.enabled}
        onChange={(v) => onToggle(alarm, v)}
        label={`${alarm.label} on or off`}
      />
    </li>
  );
}
