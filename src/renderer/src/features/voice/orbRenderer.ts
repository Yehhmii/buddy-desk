import type { VoiceState } from '@shared/types';

import type { OrbPalette } from '@/lib/color';

export type { OrbPalette };

interface StateProfile {
  /** How much the surface wobbles at rest. */
  wobble: number;
  /** Rotation speed of the rings. */
  spin: number;
  /** How strongly audio level pushes the shape. */
  reactivity: number;
  glow: number;
}

const PROFILES: Record<VoiceState, StateProfile> = {
  idle: { wobble: 0.015, spin: 0.15, reactivity: 0, glow: 0.35 },
  listening: { wobble: 0.03, spin: 0.35, reactivity: 0.55, glow: 0.7 },
  thinking: { wobble: 0.05, spin: 1.6, reactivity: 0.1, glow: 0.55 },
  speaking: { wobble: 0.04, spin: 0.5, reactivity: 0.7, glow: 0.85 },
};

const TWO_PI = Math.PI * 2;
const BLOB_POINTS = 96;

export interface OrbFrameInput {
  ctx: CanvasRenderingContext2D;
  size: number;
  time: number;
  state: VoiceState;
  level: number;
  palette: OrbPalette;
  reducedMotion: boolean;
}

/** Holds the smoothed values between frames so the orb eases rather than jumps. */
export class OrbRenderer {
  private level = 0;
  private glow = 0.35;
  private spin = 0;

  draw(input: OrbFrameInput): void {
    const { ctx, size, time, state, palette, reducedMotion } = input;
    const p = PROFILES[state];
    this.level += (input.level - this.level) * 0.18;
    this.glow += (p.glow - this.glow) * 0.06;
    this.spin += p.spin * (reducedMotion ? 0 : 0.016);

    const cx = size / 2;
    const cy = size / 2;
    const base = size * 0.2;
    const push = this.level * p.reactivity;
    const breathe = reducedMotion ? 0 : Math.sin(time / 1400) * 0.025;
    const radius = base * (1 + breathe + push * 0.35);

    ctx.clearRect(0, 0, size, size);
    this.drawGlow(ctx, cx, cy, radius, palette);
    this.drawRings(ctx, cx, cy, radius, state, push, palette);
    this.drawBody(ctx, cx, cy, radius, time, p.wobble + push * 0.08, palette, reducedMotion);
  }

  private drawGlow(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, pal: OrbPalette): void {
    const g = ctx.createRadialGradient(cx, cy, r * 0.6, cx, cy, r * 2.6);
    g.addColorStop(0, withAlpha(pal.b, 0.32 * this.glow));
    g.addColorStop(0.5, withAlpha(pal.c, 0.12 * this.glow));
    g.addColorStop(1, withAlpha(pal.c, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 2.6, 0, TWO_PI);
    ctx.fill();
  }

  private drawRings(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    r: number,
    state: VoiceState,
    push: number,
    pal: OrbPalette,
  ): void {
    const rings = [
      { k: 1.38, arc: 0.55, dir: 1, w: 1.4 },
      { k: 1.62, arc: 0.3, dir: -1, w: 1 },
      { k: 1.88, arc: 0.8, dir: 1, w: 0.8 },
    ];
    ctx.lineCap = 'round';
    rings.forEach((ring, i) => {
      const spread = 1 + push * 0.22 * (i + 1);
      const rr = r * ring.k * spread;
      const start = this.spin * ring.dir * (1 + i * 0.4) + i * 1.9;
      const alpha = (state === 'idle' ? 0.22 : 0.45) - i * 0.07;
      ctx.strokeStyle = withAlpha(i === 1 ? pal.c : pal.b, alpha);
      ctx.lineWidth = ring.w;
      ctx.beginPath();
      ctx.arc(cx, cy, rr, start, start + TWO_PI * ring.arc);
      ctx.stroke();
    });
  }

  private drawBody(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    r: number,
    t: number,
    wobble: number,
    pal: OrbPalette,
    still: boolean,
  ): void {
    const time = still ? 0 : t / 1000;
    ctx.beginPath();
    for (let i = 0; i <= BLOB_POINTS; i++) {
      const theta = (i / BLOB_POINTS) * TWO_PI;
      const n =
        Math.sin(theta * 3 + time * 1.3) * 0.5 +
        Math.sin(theta * 5 - time * 0.9) * 0.3 +
        Math.sin(theta * 2 + time * 0.6) * 0.2;
      const rr = r * (1 + n * wobble);
      const x = cx + Math.cos(theta) * rr;
      const y = cy + Math.sin(theta) * rr;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    const g = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r * 1.15);
    g.addColorStop(0, pal.a);
    g.addColorStop(0.55, pal.b);
    g.addColorStop(1, pal.c);
    ctx.fillStyle = g;
    ctx.fill();

    const shine = ctx.createRadialGradient(
      cx - r * 0.4,
      cy - r * 0.5,
      0,
      cx - r * 0.4,
      cy - r * 0.5,
      r * 0.7,
    );
    shine.addColorStop(0, 'rgba(255,255,255,0.55)');
    shine.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = shine;
    ctx.fill();
  }
}

function withAlpha(color: string, alpha: number): string {
  const hex = color.trim();
  if (/^#[0-9a-f]{6}$/i.test(hex)) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${Math.max(0, Math.min(1, alpha))})`;
  }
  return color;
}
