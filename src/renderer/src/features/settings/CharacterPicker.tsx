import { useRef } from 'react';
import { CHARACTERS, type CharacterId } from '@shared/characters';
import { cn } from '@/lib/cn';
import Character from '@/features/voice/Character';

interface CharacterPickerProps {
  value: CharacterId;
  onChange: (id: CharacterId) => void;
  /** Preview size in pixels. */
  size?: number;
}

/** A grid of live previews. Used on the settings page and in the first-run guide. */
export default function CharacterPicker({ value, onChange, size = 130 }: CharacterPickerProps) {
  const level = useRef(() => 0).current;
  return (
    <div className="grid grid-cols-2 gap-4" role="radiogroup" aria-label="Character">
      {CHARACTERS.map((c) => {
        const active = value === c.id;
        return (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(c.id)}
            className={cn(
              'no-drag flex flex-col items-center gap-1.5 rounded-[20px] px-3 pt-3 pb-4 text-center transition',
              active ? 'bg-accent-soft ring-2 ring-accent' : 'bg-fill hover:brightness-95',
            )}
          >
            <span className="pointer-events-none">
              <Character state="idle" getLevel={level} size={size} label={c.name} character={c.id} />
            </span>
            <span className="text-[15px] font-medium">{c.name}</span>
            <span className="text-[12px] leading-snug text-mute">{c.blurb}</span>
          </button>
        );
      })}
    </div>
  );
}
