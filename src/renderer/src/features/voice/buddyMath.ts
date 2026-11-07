import type { VoiceState } from '@shared/types';

export type Pose = 'standing' | 'waving';

/** Standing while resting or thinking, waving while it is listening or talking to you. */
export function poseFor(state: VoiceState): Pose {
  return state === 'listening' || state === 'speaking' ? 'waving' : 'standing';
}

/** Forward then backward, so the loop has no jump where the last frame meets the first. */
export function pingPong(step: number, count: number): number {
  if (count <= 1) return 0;
  const period = (count - 1) * 2;
  const i = step % period;
  return i < count ? i : period - i;
}
