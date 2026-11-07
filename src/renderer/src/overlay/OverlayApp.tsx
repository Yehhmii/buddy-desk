import { useEffect, useRef, useState } from 'react';
import type { VoiceSnapshot } from '@shared/types';
import Character from '@/features/voice/Character';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { cn } from '@/lib/cn';

const EMPTY: VoiceSnapshot = { state: 'idle', userText: '', replyText: '', notice: '', actions: [] };
const LABELS = { idle: '', listening: 'Listening', thinking: 'Thinking', speaking: '' } as const;

/**
 * The floating orb. Pure view: the main window runs the voice engine and mirrors its state here.
 */
export default function OverlayApp() {
  const [snap, setSnap] = useState<VoiceSnapshot>(EMPTY);
  const [visible, setVisible] = useState(false);
  const levelRef = useRef(0);

  useEffect(() => {
    void useSettingsStore.getState().load();
    const offs = [
      window.api.on('voice:snapshot', setSnap),
      window.api.on('overlay:visible', setVisible),
      window.api.on('settings:changed', (s) => useSettingsStore.getState().apply(s)),
      window.api.on('voice:level', (v) => {
        levelRef.current = v;
      }),
    ];
    return () => offs.forEach((off) => off());
  }, []);

  const getLevel = useRef(() => levelRef.current).current;
  const text = snap.notice || snap.replyText;
  const label = LABELS[snap.state];

  return (
    <div
      className={cn(
        'flex h-full flex-col items-center justify-end gap-1 pb-1 transition duration-200 ease-out',
        visible ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0',
      )}
      aria-live="polite"
    >
      {(snap.userText || text) && (
        <div className="mb-1 w-[400px] max-w-full rounded-[22px] bg-surface/95 px-5 py-3.5 text-center shadow-[0_14px_44px_rgba(0,0,0,0.2)]">
          {snap.userText && <p className="line-clamp-2 text-[13px] text-mute">“{snap.userText}”</p>}
          {text && (
            <p
              className={cn(
                'line-clamp-4 text-[15px] leading-snug',
                snap.userText && 'mt-1.5',
                snap.notice ? 'text-danger' : 'text-ink',
              )}
            >
              {text}
            </p>
          )}
          {snap.actions.map((a, i) => (
            <p key={i} className={cn('mt-1 text-[12px] font-medium', a.ok ? 'text-ok' : 'text-danger')}>
              {a.summary}
            </p>
          ))}
        </div>
      )}
      <Character state={snap.state} getLevel={getLevel} size={200} label="Jarvis" />
      <p className="-mt-6 h-4 text-[12px] font-medium text-mute">{label}</p>
    </div>
  );
}
