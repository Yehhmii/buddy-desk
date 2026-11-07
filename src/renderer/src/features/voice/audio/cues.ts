let ctx: AudioContext | null = null;

function context(): AudioContext {
  ctx ??= new AudioContext();
  return ctx;
}

function tone(freq: number, start: number, duration: number, volume: number): void {
  const c = context();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, c.currentTime + start);
  gain.gain.linearRampToValueAtTime(volume, c.currentTime + start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + duration);
  osc.connect(gain).connect(c.destination);
  osc.start(c.currentTime + start);
  osc.stop(c.currentTime + start + duration + 0.05);
}

/** Short rising two-note cue when Jarvis starts listening. */
export function playListenCue(): void {
  tone(660, 0, 0.12, 0.08);
  tone(880, 0.09, 0.16, 0.08);
}

/** Repeating alarm tone. Call the returned function to silence it. */
export function startAlarmTone(): () => void {
  let stopped = false;
  const burst = (): void => {
    if (stopped) return;
    tone(880, 0, 0.18, 0.18);
    tone(880, 0.25, 0.18, 0.18);
    tone(1175, 0.5, 0.3, 0.18);
  };
  burst();
  const timer = setInterval(burst, 1800);
  return () => {
    stopped = true;
    clearInterval(timer);
  };
}

/** Soft falling two-note cue when a conversation ends. */
export function playEndCue(): void {
  tone(660, 0, 0.14, 0.07);
  tone(440, 0.1, 0.22, 0.07);
}
