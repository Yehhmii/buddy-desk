import { useCallback, useEffect, useState } from 'react';
import type { SecretStatus } from '@shared/types';
import Segmented from '@/components/ui/Segmented';
import TextField from '@/components/ui/TextField';
import { useSettingsStore } from '@/stores/useSettingsStore';
import KeyField from '../KeyField';
import { PROVIDER_INFO } from '../providers';
import SettingGroup from '../SettingGroup';
import SettingRow from '../SettingRow';
import { useSave } from '../useSettingsActions';

function ModelRow({
  label,
  hint,
  value,
  onSave,
}: {
  label: string;
  hint: string;
  value: string;
  onSave: (v: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => {
    setDraft(value);
  }, [value]);
  const commit = (): void => {
    const next = draft.trim();
    if (next && next !== value) onSave(next);
    else setDraft(value);
  };
  return (
    <SettingRow label={label} hint={hint}>
      <TextField
        value={draft}
        spellCheck={false}
        aria-label={label}
        className="w-64"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && commit()}
      />
    </SettingRow>
  );
}

export default function ProvidersSection() {
  const ai = useSettingsStore((s) => s.settings?.ai);
  const save = useSave();
  const [status, setStatus] = useState<SecretStatus | null>(null);
  const refresh = useCallback(() => {
    void window.api.secrets.status().then(setStatus);
  }, []);
  useEffect(() => {
    refresh();
  }, [refresh]);
  if (!ai || !status) return null;

  return (
    <SettingGroup
      title="AI providers"
      description="Add any one key and Jarvis works. With several, it switches automatically if one is rate limited. Keys are encrypted on this computer and never shown to the interface."
    >
      {PROVIDER_INFO.map((p) => (
        <div key={p.id} className="border-b border-line py-4">
          <p className="text-[15px]">
            {p.label}{' '}
            <span className="ml-1.5 rounded-full bg-fill px-2 py-0.5 text-[11px] font-medium text-mute">
              {p.badge}
            </span>
          </p>
          <p className="mt-0.5 mb-2.5 text-[13px] leading-snug text-mute">{p.blurb}</p>
          <KeyField info={p} status={status} onChange={setStatus} />
        </div>
      ))}
      {!status.encryptionAvailable && (
        <p className="py-3 text-[13px] text-danger">
          Secure storage is unavailable. Put keys in your .env file instead.
        </p>
      )}

      <SettingRow
        label="Preferred provider"
        hint="Auto uses the free ones first. Screenshots go to Gemini, OpenAI or Claude, never Groq."
      >
        <Segmented
          label="Preferred provider"
          value={ai.provider}
          options={[
            { value: 'auto', label: 'Auto' },
            { value: 'groq', label: 'Groq' },
            { value: 'gemini', label: 'Gemini' },
            { value: 'openai', label: 'OpenAI' },
            { value: 'anthropic', label: 'Claude' },
          ]}
          onChange={(provider) => void save({ ai: { provider } })}
        />
      </SettingRow>

      <details className="py-3">
        <summary className="no-drag cursor-pointer text-[14px] text-mute hover:text-ink">Model names</summary>
        <p className="mt-1 text-[13px] text-mute">
          Model names change often. If requests start failing with “model not found”, update the name here.
        </p>
        <ModelRow
          label="Groq model"
          hint="console.groq.com/docs/models"
          value={ai.groqModel}
          onSave={(groqModel) => void save({ ai: { groqModel } })}
        />
        <ModelRow
          label="Gemini model"
          hint="gemini-flash-latest always points at the current Flash model."
          value={ai.geminiModel}
          onSave={(geminiModel) => void save({ ai: { geminiModel } })}
        />
        <ModelRow
          label="OpenAI model"
          hint="platform.openai.com/docs/models"
          value={ai.openaiModel}
          onSave={(openaiModel) => void save({ ai: { openaiModel } })}
        />
        <ModelRow
          label="Claude model"
          hint="claude-haiku-5-5 is fast and cheap. docs.claude.com lists the others."
          value={ai.anthropicModel}
          onSave={(anthropicModel) => void save({ ai: { anthropicModel } })}
        />
        <ModelRow
          label="Groq speech model"
          hint="Voice input through Groq."
          value={ai.sttModel}
          onSave={(sttModel) => void save({ ai: { sttModel } })}
        />
        <ModelRow
          label="OpenAI speech model"
          hint="Voice input through OpenAI."
          value={ai.openaiSttModel}
          onSave={(openaiSttModel) => void save({ ai: { openaiSttModel } })}
        />
      </details>
    </SettingGroup>
  );
}
