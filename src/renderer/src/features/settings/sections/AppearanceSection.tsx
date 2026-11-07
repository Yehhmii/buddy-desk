import { cn } from '@/lib/cn';
import { ORB_COLORS } from '@/lib/color';
import CharacterPicker from '../CharacterPicker';
import { useSettingsStore } from '@/stores/useSettingsStore';
import SettingGroup from '../SettingGroup';
import SettingRow from '../SettingRow';
import { useSave } from '../useSettingsActions';

export default function AppearanceSection() {
  const appearance = useSettingsStore((s) => s.settings?.appearance);
  const save = useSave();
  if (!appearance) return null;

  return (
    <SettingGroup
      title="Character"
      description="Who appears in the app and in the floating window when you talk to Jarvis."
    >
      <div className="border-b border-line py-5">
        <CharacterPicker
          value={appearance.character}
          onChange={(character) => void save({ appearance: { character } })}
        />
      </div>

      <SettingRow
        label="Orb colour"
        hint={
          appearance.character !== 'orb'
            ? 'Applies to the orb. Switch to the orb to see it.'
            : 'Pick a colour or choose your own.'
        }
      >
        <div className="flex items-center gap-2">
          {ORB_COLORS.map((c) => (
            <button
              key={c.hex}
              type="button"
              title={c.name}
              aria-label={c.name}
              aria-pressed={appearance.orbColor === c.hex}
              onClick={() => void save({ appearance: { orbColor: c.hex } })}
              className={cn(
                'no-drag size-7 rounded-full transition',
                appearance.orbColor === c.hex
                  ? 'ring-2 ring-ink ring-offset-2 ring-offset-paper'
                  : 'hover:scale-110',
              )}
              style={{ background: c.hex }}
            />
          ))}
          <label
            className="no-drag relative grid size-7 cursor-pointer place-items-center overflow-hidden rounded-full ring-1 ring-line"
            title="Custom colour"
          >
            <span
              className="absolute inset-0"
              style={{
                background: 'conic-gradient(#ff375f, #ff9f0a, #ffd60a, #30d158, #0a84ff, #8b5cf6, #ff375f)',
              }}
            />
            <input
              type="color"
              value={appearance.orbColor}
              aria-label="Custom orb colour"
              onChange={(e) => void save({ appearance: { orbColor: e.target.value } })}
              className="absolute inset-0 size-full cursor-pointer opacity-0"
            />
          </label>
        </div>
      </SettingRow>
    </SettingGroup>
  );
}
