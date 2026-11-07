import { useEffect, useState } from 'react';
import type { AppInfo } from '@shared/types';
import { formatClockTime } from '@shared/time';
import Segmented from '@/components/ui/Segmented';
import Switch from '@/components/ui/Switch';
import TextField from '@/components/ui/TextField';
import { useSettingsStore } from '@/stores/useSettingsStore';
import SettingGroup from '../SettingGroup';
import SettingRow from '../SettingRow';
import { useSave } from '../useSettingsActions';

export default function GeneralSection() {
  const g = useSettingsStore((s) => s.settings?.general);
  const save = useSave();
  const [name, setName] = useState(g?.userName ?? '');
  const [info, setInfo] = useState<AppInfo | null>(null);
  useEffect(() => {
    void window.api.app.info().then(setInfo);
  }, [g?.wakeForAlarms]);
  useEffect(() => {
    setName(g?.userName ?? '');
  }, [g?.userName]);
  if (!g) return null;

  return (
    <SettingGroup title="General">
      <SettingRow label="Your name" hint="Used in the greeting and by the assistant.">
        <TextField
          value={name}
          maxLength={40}
          aria-label="Your name"
          className="w-56"
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name.trim() !== g.userName && void save({ general: { userName: name.trim() } })}
        />
      </SettingRow>
      <SettingRow label="Start when I sign in to Windows" hint="Only applies to the installed app.">
        <Switch
          checked={g.launchAtLogin}
          onChange={(v) => void save({ general: { launchAtLogin: v } })}
          label="Start at login"
        />
      </SettingRow>
      <SettingRow
        label="Start quietly in the tray"
        hint="When Windows signs you in, Jarvis starts listening without opening a window."
      >
        <Switch
          checked={g.startHidden}
          onChange={(v) => void save({ general: { startHidden: v } })}
          label="Start hidden"
        />
      </SettingRow>
      {info?.platform === 'win32' && (
        <SettingRow
          label="Wake my PC for alarms"
          hint={
            info.alarmWake.error
              ? `Could not set the wake timer: ${info.alarmWake.error}`
              : g.wakeForAlarms && info.alarmWake.scheduledFor
                ? `Next wake-up at ${formatClockTime(info.alarmWake.scheduledFor)}. Needs “Allow wake timers” on in Windows power options. Some laptops cannot wake for timers.`
                : 'Lets an alarm ring even if the PC is asleep or Jarvis was closed. Needs “Allow wake timers” on in Windows power options.'
          }
        >
          <Switch
            checked={g.wakeForAlarms}
            onChange={(v) => void save({ general: { wakeForAlarms: v } })}
            label="Wake PC for alarms"
          />
        </SettingRow>
      )}
      <SettingRow label="Show my tasks on launch">
        <Switch
          checked={g.briefingOnLaunch}
          onChange={(v) => void save({ general: { briefingOnLaunch: v } })}
          label="Show briefing on launch"
        />
      </SettingRow>
      <SettingRow label="Read the briefing aloud">
        <Switch
          checked={g.speakBriefing}
          onChange={(v) => void save({ general: { speakBriefing: v } })}
          label="Speak briefing"
        />
      </SettingRow>
      <SettingRow
        label="Install updates automatically"
        hint="Checks for a new version in the background and installs it the next time you quit."
      >
        <Switch
          checked={g.autoUpdate}
          onChange={(v) => void save({ general: { autoUpdate: v } })}
          label="Automatic updates"
        />
      </SettingRow>
      <SettingRow label="Keep running in the tray when closed">
        <Switch
          checked={g.closeToTray}
          onChange={(v) => void save({ general: { closeToTray: v } })}
          label="Close to tray"
        />
      </SettingRow>
      <SettingRow label="Appearance">
        <Segmented
          label="Appearance"
          value={g.theme}
          options={[
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
            { value: 'system', label: 'System' },
          ]}
          onChange={(v) => void save({ general: { theme: v } })}
        />
      </SettingRow>
    </SettingGroup>
  );
}
