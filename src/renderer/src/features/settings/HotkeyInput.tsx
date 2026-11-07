import { useState } from 'react';
import { keyEventToAccelerator, prettyAccelerator } from '@/lib/accelerator';
import { cn } from '@/lib/cn';

interface HotkeyInputProps {
  value: string;
  onChange: (accelerator: string) => void;
}

/** Click, then press the combination you want. */
export default function HotkeyInput({ value, onChange }: HotkeyInputProps) {
  const [recording, setRecording] = useState(false);

  return (
    <button
      type="button"
      aria-label="Voice shortcut"
      onClick={() => setRecording(true)}
      onBlur={() => setRecording(false)}
      onKeyDown={(e) => {
        if (!recording) return;
        e.preventDefault();
        if (e.key === 'Escape') return setRecording(false);
        const combo = keyEventToAccelerator(e);
        if (combo) {
          setRecording(false);
          onChange(combo);
        }
      }}
      className={cn(
        'no-drag h-9 min-w-40 rounded-control bg-fill px-3.5 text-sm tabular-nums transition',
        recording && 'ring-2 ring-accent/50 text-mute',
      )}
    >
      {recording ? 'Press shortcut' : prettyAccelerator(value)}
    </button>
  );
}
