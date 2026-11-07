import Switch from '@/components/ui/Switch';
import { useSettingsStore } from '@/stores/useSettingsStore';
import SettingGroup from '../SettingGroup';
import SettingRow from '../SettingRow';
import { useSave } from '../useSettingsActions';

export default function ReportSection() {
  const r = useSettingsStore((s) => s.settings?.report);
  const save = useSave();
  if (!r) return null;

  return (
    <SettingGroup title="Day report">
      <SettingRow label="Write a report every day">
        <Switch
          checked={r.autoDaily}
          onChange={(v) => void save({ report: { autoDaily: v } })}
          label="Automatic daily report"
        />
      </SettingRow>
      <SettingRow
        label="Ask to read it aloud"
        hint="When the report is ready and you are at the computer, Jarvis appears and asks if you would like it read out."
      >
        <Switch
          checked={r.askToRead}
          disabled={!r.autoDaily}
          onChange={(v) => void save({ report: { askToRead: v } })}
          label="Ask to read the report aloud"
        />
      </SettingRow>
      <SettingRow label="Time" hint="Jarvis writes it once the app is running at or after this time.">
        <input
          type="time"
          value={r.time}
          disabled={!r.autoDaily}
          aria-label="Report time"
          onChange={(e) => e.target.value && void save({ report: { time: e.target.value } })}
          className="no-drag h-9 rounded-control bg-fill px-3 text-sm tabular-nums outline-none disabled:opacity-40"
        />
      </SettingRow>
    </SettingGroup>
  );
}
