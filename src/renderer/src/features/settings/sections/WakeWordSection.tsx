import { useEffect, useState } from 'react';
import {
  WAKE_PRESETS,
  adviseWakePhrase,
  isValidWakePhrase,
  normalizeWakePhrase,
  type WakeSensitivity,
} from '@shared/wakeWord';
import Button from '@/components/ui/Button';
import Segmented from '@/components/ui/Segmented';
import Switch from '@/components/ui/Switch';
import TextField from '@/components/ui/TextField';
import { cn } from '@/lib/cn';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useWakeStore } from '@/stores/useWakeStore';
import SettingGroup from '../SettingGroup';
import SettingRow from '../SettingRow';
import WakeWordTester from '../WakeWordTester';
import { useSave } from '../useSettingsActions';

const SENSITIVITY = [
  { value: 'low', label: 'Strict' },
  { value: 'medium', label: 'Balanced' },
  { value: 'high', label: 'Quick' },
] as const;

const SENSITIVITY_HINT: Record<WakeSensitivity, string> = {
  low: 'Fewest accidental triggers. You may need to say it clearly.',
  medium: 'Waits for you to finish the phrase. Good default.',
  high: 'Reacts the moment it hears the phrase. More false triggers.',
};

const mb = (bytes: number): string => `${Math.round(bytes / 1_000_000)} MB`;

export default function WakeWordSection() {
  const wake = useSettingsStore((s) => s.settings?.voice.wakeWord);
  const save = useSave();
  const model = useWakeStore((s) => s.model);
  const progress = useWakeStore((s) => s.progress);
  const runtime = useWakeStore((s) => s.runtime);
  const runtimeError = useWakeStore((s) => s.error);
  const [draft, setDraft] = useState(wake?.phrase ?? '');
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(wake?.phrase ?? '');
  }, [wake?.phrase]);
  if (!wake) return null;

  const advice = adviseWakePhrase(draft);
  const commit = (value: string): void => {
    const phrase = normalizeWakePhrase(value);
    if (isValidWakePhrase(phrase) && phrase !== wake.phrase) void save({ voice: { wakeWord: { phrase } } });
    else setDraft(wake.phrase);
  };

  const download = async (): Promise<void> => {
    setDownloading(true);
    setDownloadError(null);
    try {
      useWakeStore.getState().setModel(await window.api.wake.downloadModel());
    } catch (e) {
      setDownloadError(e instanceof Error ? e.message : 'Download failed.');
    } finally {
      setDownloading(false);
      useWakeStore.getState().setProgress(null);
    }
  };

  const installed = model?.installed ?? false;
  const pct =
    progress && progress.totalBytes > 0
      ? Math.round((progress.receivedBytes / progress.totalBytes) * 100)
      : null;
  const status = !wake.enabled
    ? null
    : !installed
      ? 'Download the model to start listening.'
      : runtime === 'listening'
        ? 'Listening for your wake word.'
        : runtime === 'loading'
          ? 'Starting up…'
          : runtime === 'error'
            ? (runtimeError ?? 'Could not start.')
            : 'Paused while Jarvis is busy.';

  return (
    <SettingGroup
      title="Wake word"
      description="Say a phrase to start talking, hands free. Recognition runs on this computer, no audio leaves it until you start a command."
    >
      <SettingRow
        label="Listen for wake word"
        hint={status ?? 'Keeps the microphone open while the app runs.'}
      >
        <Switch
          checked={wake.enabled}
          disabled={!installed}
          onChange={(v) => void save({ voice: { wakeWord: { enabled: v } } })}
          label="Listen for wake word"
        />
      </SettingRow>

      <SettingRow
        label="Phrase"
        hint={
          <span
            className={cn(advice.level === 'error' && 'text-danger', advice.level === 'warn' && 'text-ink')}
          >
            {advice.message}
          </span>
        }
      >
        <TextField
          value={draft}
          maxLength={30}
          aria-label="Wake phrase"
          className="w-56"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => commit(draft)}
          onKeyDown={(e) => e.key === 'Enter' && commit(draft)}
        />
      </SettingRow>

      <div className="flex flex-wrap gap-2 border-b border-line py-3.5">
        {WAKE_PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => commit(p)}
            className={cn(
              'no-drag rounded-full px-3.5 py-1.5 text-[13px] font-medium transition',
              wake.phrase === p ? 'bg-accent-soft text-accent' : 'bg-fill text-mute hover:text-ink',
            )}
          >
            {p}
          </button>
        ))}
      </div>

      <SettingRow label="Sensitivity" hint={SENSITIVITY_HINT[wake.sensitivity]}>
        <Segmented
          label="Sensitivity"
          value={wake.sensitivity}
          options={SENSITIVITY}
          onChange={(v) => void save({ voice: { wakeWord: { sensitivity: v } } })}
        />
      </SettingRow>

      <SettingRow
        label="Recognition model"
        hint={
          installed
            ? `Installed, ${mb(model?.sizeBytes ?? 0)}.`
            : (downloadError ?? 'About 40 MB, downloaded once.')
        }
      >
        {installed ? (
          <WakeWordTester
            phrase={draft && isValidWakePhrase(draft) ? normalizeWakePhrase(draft) : wake.phrase}
            sensitivity={wake.sensitivity}
            disabled={false}
          />
        ) : (
          <Button variant="primary" size="sm" disabled={downloading} onClick={() => void download()}>
            {downloading ? (pct !== null ? `Downloading ${pct}%` : 'Downloading') : 'Download'}
          </Button>
        )}
      </SettingRow>
    </SettingGroup>
  );
}
