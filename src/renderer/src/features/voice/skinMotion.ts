import { poseFor } from './buddyMath';
import type { VoiceState } from '@shared/types';

/** Pure animation maths for vector skins, kept free of the DOM so it can be tested. */

export interface SkinFrame {
  waveAmount: number;
  breath: number;
  bob: number;
  headTilt: number;
  armRAngle: (rest: number, waveAngle: number) => number;
  armLAngle: (rest: number) => number;
  sway: (phase: number) => number;
  blink: number;
  mouth: (closed: number) => number;
}

/** Eyes close for a moment every few seconds. Returns the vertical scale of the eyes, 1 = fully open. */
export function blinkScale(seconds: number, every = 3.8, length = 0.16): number {
  const phase = seconds % every;
  if (phase >= length) return 1;
  const half = length / 2;
  return Math.max(0.08, Math.abs(phase - half) / half);
}

export function targetWave(state: VoiceState): number {
  return poseFor(state) === 'waving' ? 1 : 0;
}

export function frameAt(seconds: number, wave: number, state: VoiceState, level: number): SkinFrame {
  const speaking = state === 'speaking';
  return {
    waveAmount: wave,
    breath: 1 + Math.sin(seconds * 2) * 0.006,
    bob: Math.sin(seconds * 2.2) * 2,
    headTilt: Math.sin(seconds * 1.3) * 1.6 + wave * Math.sin(seconds * 3) * 2.5,
    armRAngle: (rest, waveAngle) => rest + (waveAngle - rest) * wave + wave * Math.sin(seconds * 8.5) * 16,
    armLAngle: (rest) => rest + Math.sin(seconds * 2) * 1.5,
    sway: (phase) => Math.sin(seconds * 2.4 + phase) * (4 + wave * 3),
    blink: blinkScale(seconds),
    mouth: (closed) =>
      speaking ? closed + Math.min(1, level * 1.4) * 0.9 : wave > 0.5 ? closed + 0.12 : closed,
  };
}
