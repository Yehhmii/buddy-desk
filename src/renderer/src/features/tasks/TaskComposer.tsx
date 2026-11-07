import { useState } from 'react';
import Icon from '@/components/ui/Icon';

interface TaskComposerProps {
  onAdd: (title: string) => Promise<void>;
  onScreenshot: () => void;
}

export default function TaskComposer({ onAdd, onScreenshot }: TaskComposerProps) {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (): Promise<void> => {
    const title = value.trim();
    if (!title || busy) return;
    setBusy(true);
    try {
      await onAdd(title);
      setValue('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-4 border-b border-line py-3.5">
      <span className="grid size-[22px] shrink-0 place-items-center text-mute">
        <Icon name="plus" size={18} />
      </span>
      <input
        value={value}
        maxLength={200}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && void submit()}
        placeholder="Add a task"
        aria-label="Add a task"
        className="no-drag w-full bg-transparent text-[16px] placeholder:text-mute outline-none"
      />
      <button
        type="button"
        onClick={onScreenshot}
        aria-label="New task from a screenshot"
        title="New task from a screenshot"
        className="no-drag grid size-8 shrink-0 place-items-center rounded-full text-mute transition hover:text-accent"
      >
        <Icon name="camera" size={18} />
      </button>
    </div>
  );
}
