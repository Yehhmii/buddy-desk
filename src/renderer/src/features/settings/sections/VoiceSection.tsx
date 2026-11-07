import { useEffect, useState } from 'react';
import { adviseWakePhrase, isValidWakePhrase, normalizeWakePhrase } from '@shared/wakeWord';
import Select from '@/components/ui/Select';
import TextField from '@/components/ui/TextField';
import Slider from '@/components/ui/Slider';
import Switch from '@/components/ui/Switch';
import { useSettingsStore } from '@/stores/useSettingsStore';
import HotkeyInput from '../HotkeyInput';
import SettingGroup from '../SettingGroup';
import SettingRow from '../SettingRow';
import { useSave } from '../useSettingsActions';

const VOICES = [
  { value: 'en-GB-RyanNeural', label: 'Ryan, British' },
  { value: 'en-GB-SoniaNeural', label: 'Sonia, British' },
  { value: 'en-US-GuyNeural', label: 'Guy, American' },
  { value: 'en-US-AriaNeural', label: 'Aria, American' },
  { value: 'en-US-JennyNeural', label: 'Jenny, American' },
  { value: 'en-NG-AbeoNeural', label: 'Abeo, Nigerian' },
  { value: 'en-NG-EzinneNeural', label: 'Ezinne, Nigerian' },
];

export default function VoiceSection() {
  const v = useSettingsStore((s) => s.settings?.voice);
  const save = useSave();
  const [endDraft, setEndDraft] = useState(v?.endPhrase ?? '');
  useEffect(() => {
    setEndDraft(v?.endPhrase ?? '');
  }, [v?.endPhrase]);
  if (!v) return null;

  const commitEnd = (): void => {
    const phrase = normalizeWakePhrase(endDraft);
    if (isValidWakePhrase(phrase) && phrase !== v.endPhrase) void save({ voice: { endPhrase: phrase } });
    else setEndDraft(v.endPhrase);
  };
  const endAdvice = adviseWakePhrase(endDraft);

  return (
    <SettingGroup title="Voice">
      <SettingRow
        label="Talk shortcut"
        hint="Works from anywhere in Windows. Press it again to finish speaking early."
      >
        <HotkeyInput value={v.hotkey} onChange={(hotkey) => void save({ voice: { hotkey } })} />
      </SettingRow>
      <SettingRow
        label="Keep the conversation going"
        hint="After a reply, Jarvis listens again by itself, so you do not need the wake word between questions."
      >
        <Switch
          checked={v.conversationMode}
          onChange={(conversationMode) => void save({ voice: { conversationMode } })}
          label="Keep the conversation going"
        />
      </SettingRow>
      <SettingRow
        label="End phrase"
        hint={
          endAdvice.level === 'error'
            ? endAdvice.message
            : '“That’s all”, “end conversation”, “stop listening” and “go to sleep” also work.'
        }
      >
        <TextField
          value={endDraft}
          maxLength={30}
          aria-label="End phrase"
          className="w-56"
          disabled={!v.conversationMode}
          onChange={(e) => setEndDraft(e.target.value)}
          onBlur={commitEnd}
          onKeyDown={(e) => e.key === 'Enter' && commitEnd()}
        />
      </SettingRow>
      <SettingRow
        label="Wait for my reply"
        hint={`Ends on its own after ${v.followUpSeconds} seconds of silence. Waits longer after a question.`}
      >
        <Slider
          label="Wait for my reply"
          min={4}
          max={30}
          step={1}
          value={v.followUpSeconds}
          onChange={(followUpSeconds) => void save({ voice: { followUpSeconds } })}
        />
      </SettingRow>
      <SettingRow
        label="Show the floating orb"
        hint="A small orb appears at the bottom of your screen when Jarvis is listening or answering, without opening the app."
      >
        <Switch
          checked={v.showOverlay}
          onChange={(showOverlay) => void save({ voice: { showOverlay } })}
          label="Floating orb"
        />
      </SettingRow>
      <SettingRow
        label="Show what I say and what Jarvis replies in the floating window"
        hint="Turn this off for privacy: the floating window then shows only the character and whether it is listening, thinking or speaking. Your words and the replies stay in the app."
      >
        <Switch
          checked={v.overlayShowText}
          disabled={!v.showOverlay}
          onChange={(overlayShowText) => void save({ voice: { overlayShowText } })}
          label="Show text in the floating window"
        />
      </SettingRow>
      <SettingRow label="Speak replies">
        <Switch
          checked={v.speakReplies}
          onChange={(x) => void save({ voice: { speakReplies: x } })}
          label="Speak replies"
        />
      </SettingRow>
      <SettingRow label="Voice">
        <Select
          aria-label="Voice"
          value={v.voiceName}
          options={VOICES}
          onChange={(voiceName) => void save({ voice: { voiceName } })}
        />
      </SettingRow>
      <SettingRow label="Speaking speed" hint={`${v.speechRate > 0 ? '+' : ''}${v.speechRate}%`}>
        <Slider
          label="Speaking speed"
          min={-30}
          max={40}
          step={5}
          value={v.speechRate}
          onChange={(speechRate) => void save({ voice: { speechRate } })}
        />
      </SettingRow>
      <SettingRow
        label="Pause before I am considered done"
        hint={`${(v.silenceMs / 1000).toFixed(1)} seconds of quiet`}
      >
        <Slider
          label="Silence length"
          min={600}
          max={2500}
          step={100}
          value={v.silenceMs}
          onChange={(silenceMs) => void save({ voice: { silenceMs } })}
        />
      </SettingRow>
      <SettingRow label="Play a sound when listening starts">
        <Switch
          checked={v.chime}
          onChange={(chime) => void save({ voice: { chime } })}
          label="Listening sound"
        />
      </SettingRow>
    </SettingGroup>
  );
}
