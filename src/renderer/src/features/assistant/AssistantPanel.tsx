import { useCallback } from 'react';
import Character from '@/features/voice/Character';
import { useVoice } from '@/features/voice/VoiceProvider';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useUiStore } from '@/stores/useUiStore';
import { useWakeStore } from '@/stores/useWakeStore';
import CommandBar from './CommandBar';
import ConversationLog from './ConversationLog';

const LABELS = { idle: '', listening: 'Listening', thinking: 'Thinking', speaking: 'Speaking' } as const;

export default function AssistantPanel() {
  const voice = useVoice();
  const state = useUiStore((s) => s.voiceState);
  const conversation = useUiStore((s) => s.conversation);
  const endPhrase = useSettingsStore((s) => s.settings?.voice.endPhrase);
  const character = useSettingsStore((s) => s.settings?.appearance.character);
  const wake = useSettingsStore((s) => s.settings?.voice.wakeWord);
  const hotkey = useSettingsStore((s) => s.settings?.voice.hotkey);
  const runtime = useWakeStore((s) => s.runtime);
  const getLevel = useCallback(() => voice.level(), [voice]);

  const hint =
    wake?.enabled && runtime === 'listening'
      ? `Say “${wake.phrase}”`
      : hotkey
        ? `Press ${hotkey.replace('Control', 'Ctrl').replaceAll('+', ' + ')} or tap the orb`
        : 'Tap the orb';

  return (
    <aside className="flex h-full w-[340px] shrink-0 flex-col items-center gap-3 pb-2">
      <Character
        state={state}
        getLevel={getLevel}
        size={290}
        onClick={() => voice.trigger('click')}
        label="Talk to Jarvis"
      />
      <p
        className={`h-5 text-[13px] font-medium text-mute ${character && character !== 'orb' ? 'mt-1' : '-mt-4'}`}
        aria-live="polite"
      >
        {LABELS[state] || (conversation ? `Say “${endPhrase ?? 'goodbye'}” to end` : hint)}
      </p>
      {conversation && (
        <button
          type="button"
          onClick={() => voice.endConversation()}
          className="no-drag rounded-full bg-fill px-3.5 py-1 text-[12px] font-medium text-mute transition hover:text-ink"
        >
          End conversation
        </button>
      )}
      <div className="flex min-h-0 w-full flex-1 flex-col gap-3">
        <ConversationLog />
        <CommandBar />
      </div>
    </aside>
  );
}
