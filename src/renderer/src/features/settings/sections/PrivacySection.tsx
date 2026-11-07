import { useEffect, useState } from 'react';
import type { AppInfo } from '@shared/types';
import Switch from '@/components/ui/Switch';
import { useSettingsStore } from '@/stores/useSettingsStore';
import SettingGroup from '../SettingGroup';
import SettingRow from '../SettingRow';
import { useSave } from '../useSettingsActions';

export default function PrivacySection() {
  const p = useSettingsStore((s) => s.settings?.privacy);
  const hotkey = useSettingsStore((s) => s.settings?.voice.hotkey);
  const save = useSave();
  const [info, setInfo] = useState<AppInfo | null>(null);
  useEffect(() => {
    void window.api.app.info().then(setInfo);
  }, [hotkey, p?.hideFromCapture]);
  if (!p) return null;

  return (
    <SettingGroup
      title="Privacy"
      description="Screen reading happens only when you ask for it, never in the background."
    >
      <SettingRow
        label="Hide this window from screen sharing and recording"
        hint="Zoom, Teams, OBS and screenshots show nothing where this window is."
      >
        <Switch
          checked={p.hideFromCapture}
          onChange={(v) => void save({ privacy: { hideFromCapture: v } })}
          label="Hide from capture"
        />
      </SettingRow>
      <SettingRow
        label="Hide passwords and keys from screen text"
        hint="Removes API keys, tokens, card numbers and password lines before text goes to an AI provider."
      >
        <Switch
          checked={p.redactSensitiveText}
          onChange={(v) => void save({ privacy: { redactSensitiveText: v } })}
          label="Redact sensitive text"
        />
      </SettingRow>
      <SettingRow
        label="Allow screenshots to Gemini"
        hint="Only used for questions about charts, images or layout. Otherwise Jarvis sends text only."
      >
        <Switch
          checked={p.allowVisionUpload}
          onChange={(v) => void save({ privacy: { allowVisionUpload: v } })}
          label="Allow vision upload"
        />
      </SettingRow>
      {info && !info.hotkeyRegistered && (
        <p className="py-3 text-[13px] text-danger">
          The talk shortcut is used by another app. Pick a different one under Voice.
        </p>
      )}
    </SettingGroup>
  );
}
