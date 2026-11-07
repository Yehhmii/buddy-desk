export interface OrbPalette {
  a: string;
  b: string;
  c: string;
}

export const ORB_COLORS: ReadonlyArray<{ name: string; hex: string }> = [
  { name: 'Blue', hex: '#0a84ff' },
  { name: 'Violet', hex: '#8b5cf6' },
  { name: 'Green', hex: '#30d158' },
  { name: 'Pink', hex: '#ff375f' },
  { name: 'Orange', hex: '#ff9f0a' },
  { name: 'Graphite', hex: '#8e8e93' },
];

interface Hsl {
  h: number;
  s: number;
  l: number;
}

const clamp = (v: number, lo = 0, hi = 1): number => Math.min(hi, Math.max(lo, v));

export function hexToHsl(hex: string): Hsl {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s, l };
}

export function hslToHex({ h, s, l }: Hsl): string {
  const hue = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    hue < 60
      ? [c, x, 0]
      : hue < 120
        ? [x, c, 0]
        : hue < 180
          ? [0, c, x]
          : hue < 240
            ? [0, x, c]
            : hue < 300
              ? [x, 0, c]
              : [c, 0, x];
  const to = (v: number): string =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

/**
 * Three tones from one chosen colour: a lighter highlight, the colour itself, and a deeper shade
 * nudged around the colour wheel. That is what gives the orb its glassy depth.
 */
export function paletteFromHex(hex: string): OrbPalette {
  const base = hexToHsl(hex);
  const grey = base.s < 0.08; // graphite: keep it neutral instead of tinting it
  return {
    a: hslToHex({ h: base.h - (grey ? 0 : 12), s: base.s, l: clamp(base.l + 0.22, 0, 0.9) }),
    b: hex,
    c: hslToHex({ h: base.h + (grey ? 0 : 30), s: base.s * 0.9, l: clamp(base.l - 0.08, 0.1, 1) }),
  };
}
