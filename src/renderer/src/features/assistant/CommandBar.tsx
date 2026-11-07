import { useState } from 'react';
import Icon from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { useUiStore } from '@/stores/useUiStore';
import { useVoice } from '@/features/voice/VoiceProvider';

export default function CommandBar() {
  const voice = useVoice();
  const [value, setValue] = useState('');
  const busy = useUiStore((s) => s.voiceState !== 'idle');
  const screen = useUiStore((s) => s.screen);
  const [capturing, setCapturing] = useState(false);

  const send = (): void => {
    const text = value.trim();
    if (!text || busy) return;
    setValue('');
    void voice.submitText(text);
  };

  const toggleScreen = async (): Promise<void> => {
    setCapturing(true);
    try {
      useUiStore
        .getState()
        .setScreen(screen.attached ? await window.api.screen.clear() : await window.api.screen.attach());
    } catch (e) {
      useUiStore
        .getState()
        .pushEntry({ role: 'notice', text: e instanceof Error ? e.message : 'Could not read the screen.' });
    } finally {
      setCapturing(false);
    }
  };

  return (
    <div className="space-y-2">
      {screen.attached && (
        <p className="flex items-center justify-between rounded-full bg-accent-soft px-3.5 py-1.5 text-[12px] font-medium text-accent">
          Screen attached, {screen.chars.toLocaleString()} characters
          <button
            type="button"
            onClick={() => void toggleScreen()}
            aria-label="Remove screen text"
            className="no-drag"
          >
            <Icon name="x" size={14} />
          </button>
        </p>
      )}
      <div className="flex items-center gap-1 rounded-full bg-fill py-1 pr-1 pl-4">
        <input
          value={value}
          maxLength={2000}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Ask or tell Jarvis"
          aria-label="Command"
          className="no-drag min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-mute"
        />
        <button
          type="button"
          onClick={() => void toggleScreen()}
          disabled={capturing}
          aria-label={screen.attached ? 'Remove screen text' : 'Attach screen text'}
          title="Read my screen"
          className={cn(
            'no-drag grid size-8 place-items-center rounded-full transition',
            screen.attached ? 'text-accent' : 'text-mute hover:text-ink',
            capturing && 'animate-pulse',
          )}
        >
          <Icon name="screen" size={18} />
        </button>
        <button
          type="button"
          onClick={send}
          disabled={!value.trim() || busy}
          aria-label="Send"
          className="no-drag grid size-8 place-items-center rounded-full bg-accent text-white transition disabled:opacity-30"
        >
          <Icon name="send" size={16} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
