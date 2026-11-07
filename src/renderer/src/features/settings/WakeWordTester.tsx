import { useEffect, useRef, useState } from 'react';
import type { WakeSensitivity } from '@shared/wakeWord';
import Button from '@/components/ui/Button';
import { useVoice } from '@/features/voice/VoiceProvider';

interface WakeWordTesterProps {
  phrase: string;
  sensitivity: WakeSensitivity;
  disabled: boolean;
}

/** Listens for a few seconds and shows what the recognizer hears, so a phrase can be tried before relying on it. */
export default function WakeWordTester({ phrase, sensitivity, disabled }: WakeWordTesterProps) {
  const voice = useVoice();
  const [active, setActive] = useState(false);
  const [starting, setStarting] = useState(false);
  const [heard, setHeard] = useState('');
  const [hit, setHit] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stopRef = useRef<(() => void) | null>(null);

  const stop = (): void => {
    stopRef.current?.();
    stopRef.current = null;
    setActive(false);
  };

  useEffect(() => {
    return () => {
      stopRef.current?.();
    };
  }, []);

  const start = async (): Promise<void> => {
    setError(null);
    setHeard('');
    setHit(false);
    setActive(true);
    setStarting(true);
    try {
      stopRef.current = await voice.testWake(phrase, sensitivity, setHeard, () => setHit(true));
    } catch (e) {
      setActive(false);
      setError(e instanceof Error ? e.message : 'Could not start the microphone.');
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1.5">
      <Button size="sm" disabled={disabled} onClick={() => (active ? stop() : void start())}>
        {active ? 'Stop test' : 'Test wake word'}
      </Button>
      {active && (
        <p className="text-[13px] text-mute" aria-live="polite">
          {starting ? (
            'Loading the model, this can take 20 seconds the first time…'
          ) : hit ? (
            <span className="font-medium text-ok">Heard “{phrase}”</span>
          ) : heard ? (
            `Hearing: ${heard}`
          ) : (
            `Say “${phrase}”`
          )}
        </p>
      )}
      {error && <p className="text-[13px] text-danger">{error}</p>}
    </div>
  );
}
