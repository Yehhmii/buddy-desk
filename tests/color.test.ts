import { describe, expect, it } from 'vitest';
import { hexToHsl, hslToHex, ORB_COLORS, paletteFromHex } from '@/lib/color';
import { pingPong, poseFor } from '@/features/voice/buddyMath';
import { SettingsPatchSchema } from '@shared/settings';

describe('colour helpers', () => {
  it('round-trips a colour through HSL', () => {
    for (const { hex } of ORB_COLORS) {
      const back = hslToHex(hexToHsl(hex));
      const a = parseInt(hex.slice(1), 16);
      const b = parseInt(back.slice(1), 16);
      for (const shift of [16, 8, 0])
        expect(Math.abs(((a >> shift) & 255) - ((b >> shift) & 255))).toBeLessThanOrEqual(2);
    }
  });

  it('builds a lighter highlight and a deeper shade around the chosen colour', () => {
    const p = paletteFromHex('#0a84ff');
    expect(p.b).toBe('#0a84ff');
    expect(hexToHsl(p.a).l).toBeGreaterThan(hexToHsl(p.b).l);
    expect(hexToHsl(p.c).l).toBeLessThan(hexToHsl(p.a).l);
  });

  it('keeps graphite neutral', () => {
    const p = paletteFromHex('#8e8e93');
    expect(hexToHsl(p.a).s).toBeLessThan(0.2);
  });
});

describe('buddy animation', () => {
  it('plays forward then backward so the loop never jumps', () => {
    const seq = Array.from({ length: 8 }, (_, i) => pingPong(i, 4));
    expect(seq).toEqual([0, 1, 2, 3, 2, 1, 0, 1]);
  });

  it('stands when idle or thinking and waves when listening or speaking', () => {
    expect(['idle', 'thinking'].map((s) => poseFor(s as never))).toEqual(['standing', 'standing']);
    expect(['listening', 'speaking'].map((s) => poseFor(s as never))).toEqual(['waving', 'waving']);
  });

  it('handles a single frame', () => {
    expect(pingPong(5, 1)).toBe(0);
  });
});

describe('appearance settings', () => {
  it('accepts a character and a hex colour, rejects junk', () => {
    expect(
      SettingsPatchSchema.parse({ appearance: { character: 'buddy', orbColor: '#FF375F' } }).appearance,
    ).toEqual({ character: 'buddy', orbColor: '#ff375f' });
    expect(SettingsPatchSchema.safeParse({ appearance: { character: 'robot' } }).success).toBe(false);
    expect(SettingsPatchSchema.safeParse({ appearance: { orbColor: 'red' } }).success).toBe(false);
  });
});
