import { useState } from 'react';
import type { KeyTestResult, SecretStatus } from '@shared/types';
import Button from '@/components/ui/Button';
import TextField from '@/components/ui/TextField';
import { cn } from '@/lib/cn';
import type { ProviderInfo } from './providers';

interface KeyFieldProps {
  info: ProviderInfo;
  status: SecretStatus;
  onChange: (next: SecretStatus) => void;
}

/** Paste a key, save it, and check that it actually works. Used in Settings and in the first-run guide. */
export default function KeyField({ info, status, onChange }: KeyFieldProps) {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState<'save' | 'test' | null>(null);
  const [result, setResult] = useState<KeyTestResult | null>(null);
  const state = status[info.id];

  const save = async (): Promise<void> => {
    setBusy('save');
    setResult(null);
    try {
      onChange(await window.api.secrets.set(info.id, value));
      setValue('');
      setBusy('test');
      setResult(await window.api.secrets.test(info.id));
    } catch (e) {
      setResult({ ok: false, message: e instanceof Error ? e.message : 'Could not save the key.' });
    } finally {
      setBusy(null);
    }
  };

  const test = async (): Promise<void> => {
    setBusy('test');
    try {
      setResult(await window.api.secrets.test(info.id));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <TextField
          type="password"
          autoComplete="off"
          spellCheck={false}
          placeholder={state.configured ? 'Replace key' : 'Paste your key'}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-64"
          aria-label={`${info.label} API key`}
        />
        <Button
          size="sm"
          variant="primary"
          disabled={busy !== null || value.trim().length < 8 || !status.encryptionAvailable}
          onClick={() => void save()}
        >
          {busy === 'save' ? 'Saving' : 'Save'}
        </Button>
        {state.configured && (
          <Button size="sm" disabled={busy !== null} onClick={() => void test()}>
            {busy === 'test' ? 'Checking' : 'Test'}
          </Button>
        )}
        {state.source === 'stored' && (
          <Button
            size="sm"
            variant="danger"
            disabled={busy !== null}
            onClick={() => void window.api.secrets.clear(info.id).then((s) => (setResult(null), onChange(s)))}
          >
            Remove
          </Button>
        )}
      </div>
      <p
        className={cn('text-[13px]', result ? (result.ok ? 'text-ok' : 'text-danger') : 'text-mute')}
        aria-live="polite"
      >
        {result
          ? result.message
          : state.configured
            ? `Saved, from ${state.source === 'env' ? 'your .env file' : 'secure storage'}.`
            : `Get a key at ${info.link}`}
      </p>
    </div>
  );
}
