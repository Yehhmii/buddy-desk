import { useSettingsStore } from '@/stores/useSettingsStore';
import type { CharacterId } from '@shared/characters';
import type { VoiceState } from '@shared/types';
import BuddySprite from './BuddySprite';
import { SVG_SKINS } from './skins';
import SvgSkin from './SvgSkin';
import VoiceOrb from './VoiceOrb';

interface CharacterProps {
  state: VoiceState;
  getLevel: () => number;
  /** Side of the square the character lives in. Figures are drawn a little smaller inside it. */
  size: number;
  onClick?: () => void;
  label: string;
  /** Overrides the saved settings, used by the previews on the settings page. */
  character?: CharacterId;
  color?: string;
}

/** Shows whichever character is chosen in Settings. */
export default function Character({
  state,
  getLevel,
  size,
  onClick,
  label,
  character,
  color,
}: CharacterProps) {
  const appearance = useSettingsStore((s) => s.settings?.appearance);
  const which = character ?? appearance?.character ?? 'orb';

  if (which === 'orb') {
    return (
      <VoiceOrb
        state={state}
        getLevel={getLevel}
        size={size}
        onClick={onClick}
        label={label}
        color={color ?? appearance?.orbColor}
      />
    );
  }

  const height = Math.round(size * 0.86);
  const svg = SVG_SKINS[which];
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="no-drag grid place-items-end justify-center rounded-3xl outline-offset-4"
      style={{ width: size, height: size }}
    >
      {svg ? (
        <SvgSkin svg={svg} state={state} getLevel={getLevel} height={height} />
      ) : (
        <BuddySprite state={state} getLevel={getLevel} height={height} />
      )}
    </button>
  );
}
