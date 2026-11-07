import { useEffect, useRef } from 'react';
import { cn } from '@/lib/cn';
import { useUiStore } from '@/stores/useUiStore';

export default function ConversationLog() {
  const entries = useUiStore((s) => s.entries);
  const boxRef = useRef<HTMLDivElement>(null);

  // Scroll the log itself. scrollIntoView() is avoided on purpose: it also scrolls ancestors and, in
  // current Chromium, returns a Promise, which React would mistake for an effect cleanup function.
  useEffect(() => {
    const box = boxRef.current;
    if (box) box.scrollTop = box.scrollHeight;
  }, [entries]);

  if (entries.length === 0) return <div className="flex-1" />;

  return (
    <div ref={boxRef} className="scroll-y min-h-0 flex-1 space-y-3 px-1" aria-live="polite">
      {entries.slice(-8).map((e) => (
        <div
          key={e.id}
          className={cn(
            'text-[14px] leading-snug',
            e.role === 'user' && 'text-mute',
            e.role === 'notice' && 'text-danger',
          )}
        >
          {e.role === 'user' && <span className="mr-1.5 text-[12px] font-medium">You</span>}
          {e.text}
          {e.actions?.map((a, i) => (
            <p key={i} className={cn('mt-1 text-[12px] font-medium', a.ok ? 'text-ok' : 'text-danger')}>
              {a.summary}
            </p>
          ))}
        </div>
      ))}
    </div>
  );
}
