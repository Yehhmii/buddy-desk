import { useEffect, useState } from 'react';
import Button from '@/components/ui/Button';
import { useUiStore } from '@/stores/useUiStore';

/** Shown until at least one AI key is saved, so nobody is left wondering why Jarvis cannot answer. */
export default function SetupBanner() {
  const [missing, setMissing] = useState(false);
  const setView = useUiStore((s) => s.setView);

  useEffect(() => {
    let alive = true;
    void window.api.secrets.status().then((s) => {
      if (alive)
        setMissing(
          !(s.groq.configured || s.gemini.configured || s.openai.configured || s.anthropic.configured),
        );
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!missing) return null;
  return (
    <div className="mb-5 flex items-center justify-between gap-4 rounded-[18px] bg-accent-soft px-5 py-4">
      <div>
        <p className="text-[15px] font-medium">Add an AI key to get started</p>
        <p className="text-[13px] text-mute">
          Jarvis needs one to think. A free one works, and you paste it right in the app.
        </p>
      </div>
      <Button variant="primary" size="sm" onClick={() => setView('settings')}>
        Add key
      </Button>
    </div>
  );
}
