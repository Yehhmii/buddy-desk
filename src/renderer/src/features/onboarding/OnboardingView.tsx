import { useCallback, useEffect, useRef, useState } from 'react';
import type { SecretStatus } from '@shared/types';
import Button from '@/components/ui/Button';
import TextField from '@/components/ui/TextField';
import { cn } from '@/lib/cn';
import { ORB_COLORS } from '@/lib/color';
import Character from '@/features/voice/Character';
import CharacterPicker from '@/features/settings/CharacterPicker';
import KeyField from '@/features/settings/KeyField';
import { PROVIDER_INFO } from '@/features/settings/providers';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useWakeStore } from '@/stores/useWakeStore';

const STEPS = ['Welcome', 'Brain', 'Character', 'Voice'] as const;

/** First-run guide. Everything here can be changed later in Settings. */
export default function OnboardingView({ onDone }: { onDone: () => void }) {
  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.update);
  const model = useWakeStore((s) => s.model);
  const progress = useWakeStore((s) => s.progress);
  const [step, setStep] = useState(0);
  const [name, setName] = useState(settings?.general.userName ?? '');
  const [status, setStatus] = useState<SecretStatus | null>(null);
  const [picked, setPicked] = useState<(typeof PROVIDER_INFO)[number]['id']>('groq');
  const [mic, setMic] = useState<'idle' | 'ok' | 'blocked'>('idle');
  const [downloading, setDownloading] = useState(false);
  const level = useRef(() => 0).current;

  const refresh = useCallback(() => {
    void window.api.secrets.status().then(setStatus);
  }, []);
  useEffect(() => {
    refresh();
  }, [refresh]);

  if (!settings) return null;
  const hasKey = status ? PROVIDER_INFO.some((p) => status[p.id].configured) : false;
  const info = PROVIDER_INFO.find((p) => p.id === picked)!;

  const finish = async (): Promise<void> => {
    await update({ general: { onboarded: true, userName: name.trim() } });
    onDone();
  };

  const checkMic = async (): Promise<void> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setMic('ok');
    } catch {
      setMic('blocked');
    }
  };

  const download = async (): Promise<void> => {
    setDownloading(true);
    try {
      useWakeStore.getState().setModel(await window.api.wake.downloadModel());
    } finally {
      setDownloading(false);
      useWakeStore.getState().setProgress(null);
    }
  };

  const pct =
    progress && progress.totalBytes > 0
      ? Math.round((progress.receivedBytes / progress.totalBytes) * 100)
      : null;

  return (
    <div className="no-drag flex h-full flex-col items-center overflow-y-auto px-8 pt-16 pb-10">
      <ol className="mb-8 flex gap-2" aria-label="Progress">
        {STEPS.map((label, i) => (
          <li
            key={label}
            aria-current={i === step ? 'step' : undefined}
            className={cn('h-1.5 w-12 rounded-full transition', i <= step ? 'bg-accent' : 'bg-fill')}
            title={label}
          />
        ))}
      </ol>

      <div className="w-full max-w-xl flex-1">
        {step === 0 && (
          <section className="text-center">
            <div className="flex justify-center">
              <Character state="listening" getLevel={level} size={220} label="Jarvis" />
            </div>
            <h1 className="mt-2 text-[40px] leading-tight font-semibold tracking-[-0.035em]">Meet Jarvis</h1>
            <p className="mx-auto mt-3 max-w-md text-[16px] leading-relaxed text-mute">
              Your tasks, alarms and day report, run by talking. This takes about two minutes. You can change
              everything later.
            </p>
            <div className="mx-auto mt-8 max-w-xs text-left">
              <label className="text-[13px] font-medium text-mute" htmlFor="ob-name">
                What should I call you?
              </label>
              <TextField
                id="ob-name"
                value={name}
                maxLength={40}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="mt-1.5"
              />
            </div>
          </section>
        )}

        {step === 1 && (
          <section>
            <h1 className="text-[32px] leading-tight font-semibold tracking-[-0.03em]">Choose a brain</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-mute">
              Jarvis needs one AI key to think. Pick whichever you already have, or take a free one. Keys stay
              on this computer, encrypted.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3" role="radiogroup" aria-label="AI provider">
              {PROVIDER_INFO.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={picked === p.id}
                  onClick={() => setPicked(p.id)}
                  className={cn(
                    'flex flex-col items-start gap-1 rounded-[18px] p-4 text-left transition',
                    picked === p.id ? 'bg-accent-soft ring-2 ring-accent' : 'bg-fill hover:brightness-95',
                  )}
                >
                  <span className="flex w-full items-center justify-between text-[15px] font-medium">
                    {p.label}
                    {status?.[p.id].configured && (
                      <span className="text-[12px] font-medium text-ok">Added</span>
                    )}
                  </span>
                  <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-medium text-mute">
                    {p.badge}
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-5 rounded-[18px] bg-fill p-4">
              <p className="text-[14px] leading-snug text-mute">{info.blurb}</p>
              <div className="mt-3">
                {status && <KeyField info={info} status={status} onChange={setStatus} />}
              </div>
            </div>
          </section>
        )}

        {step === 2 && (
          <section>
            <h1 className="text-[32px] leading-tight font-semibold tracking-[-0.03em]">Pick a character</h1>
            <p className="mt-2 mb-5 text-[15px] leading-relaxed text-mute">
              This is who shows up when you talk to Jarvis.
            </p>
            <CharacterPicker
              value={settings.appearance.character}
              onChange={(character) => void update({ appearance: { character } })}
              size={120}
            />
            {settings.appearance.character === 'orb' && (
              <div className="mt-5 flex items-center justify-center gap-2">
                {ORB_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    title={c.name}
                    aria-label={c.name}
                    aria-pressed={settings.appearance.orbColor === c.hex}
                    onClick={() => void update({ appearance: { orbColor: c.hex } })}
                    className={cn(
                      'size-7 rounded-full transition',
                      settings.appearance.orbColor === c.hex
                        ? 'ring-2 ring-ink ring-offset-2 ring-offset-paper'
                        : 'hover:scale-110',
                    )}
                    style={{ background: c.hex }}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {step === 3 && (
          <section>
            <h1 className="text-[32px] leading-tight font-semibold tracking-[-0.03em]">Talk to it</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-mute">
              Press <b>{settings.voice.hotkey.replace('Control', 'Ctrl').replaceAll('+', ' + ')}</b> any time
              to talk. For hands-free use, download the small voice model and Jarvis will answer to “
              {settings.voice.wakeWord.phrase}”. It also lets you talk without a cloud speech key.
            </p>

            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between gap-4 rounded-[18px] bg-fill p-4">
                <div>
                  <p className="text-[15px] font-medium">Microphone</p>
                  <p className="text-[13px] text-mute">
                    {mic === 'ok'
                      ? 'Working.'
                      : mic === 'blocked'
                        ? 'Blocked. Allow microphone access in your system privacy settings.'
                        : 'Check that Jarvis can hear you.'}
                  </p>
                </div>
                <Button size="sm" onClick={() => void checkMic()}>
                  {mic === 'ok' ? 'Check again' : 'Allow microphone'}
                </Button>
              </div>
              <div className="flex items-center justify-between gap-4 rounded-[18px] bg-fill p-4">
                <div>
                  <p className="text-[15px] font-medium">Voice model (about 40 MB)</p>
                  <p className="text-[13px] text-mute">
                    {model?.installed
                      ? 'Installed. You can turn on the wake word in Settings.'
                      : 'Optional. Downloaded once.'}
                  </p>
                </div>
                {!model?.installed && (
                  <Button size="sm" variant="primary" disabled={downloading} onClick={() => void download()}>
                    {downloading ? (pct !== null ? `${pct}%` : 'Downloading') : 'Download'}
                  </Button>
                )}
              </div>
              {model?.installed && (
                <div className="flex items-center justify-between gap-4 rounded-[18px] bg-fill p-4">
                  <p className="text-[15px] font-medium">Listen for “{settings.voice.wakeWord.phrase}”</p>
                  <Button
                    size="sm"
                    variant={settings.voice.wakeWord.enabled ? 'primary' : 'quiet'}
                    onClick={() =>
                      void update({ voice: { wakeWord: { enabled: !settings.voice.wakeWord.enabled } } })
                    }
                  >
                    {settings.voice.wakeWord.enabled ? 'On' : 'Turn on'}
                  </Button>
                </div>
              )}
            </div>
          </section>
        )}
      </div>

      <div className="mt-8 flex w-full max-w-xl items-center justify-between">
        <Button variant="quiet" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
          Back
        </Button>
        <div className="flex items-center gap-3">
          {step === 1 && !hasKey && (
            <button
              type="button"
              onClick={() => setStep(2)}
              className="no-drag text-[13px] text-mute hover:text-ink"
            >
              Skip for now
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <Button variant="primary" disabled={step === 1 && !hasKey} onClick={() => setStep((s) => s + 1)}>
              Continue
            </Button>
          ) : (
            <Button variant="primary" onClick={() => void finish()}>
              Start using Jarvis
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
