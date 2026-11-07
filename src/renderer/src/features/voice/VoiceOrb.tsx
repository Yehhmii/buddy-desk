import { useEffect, useRef } from 'react';
import type { VoiceState } from '@shared/types';
import { paletteFromHex, type OrbPalette } from '@/lib/color';
import { OrbRenderer } from './orbRenderer';

interface VoiceOrbProps {
  state: VoiceState;
  getLevel: () => number;
  size?: number;
  onClick?: () => void;
  label: string;
  /** Hex colour such as #0a84ff. Falls back to the theme colour. */
  color?: string;
}

function readPalette(): OrbPalette {
  const css = getComputedStyle(document.documentElement);
  return {
    a: css.getPropertyValue('--orb-a') || '#5ac8fa',
    b: css.getPropertyValue('--orb-b') || '#0a84ff',
    c: css.getPropertyValue('--orb-c') || '#5e5ce6',
  };
}

export default function VoiceOrb({ state, getLevel, size = 280, onClick, label, color }: VoiceOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<VoiceState>(state);
  const levelRef = useRef(getLevel);
  const paletteRef = useRef<OrbPalette>(color ? paletteFromHex(color) : readPalette());

  useEffect(() => {
    paletteRef.current = color ? paletteFromHex(color) : readPalette();
  }, [color]);

  useEffect(() => {
    stateRef.current = state;
    levelRef.current = getLevel;
  }, [state, getLevel]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const renderer = new OrbRenderer();
    let raf = 0;

    const frame = (time: number): void => {
      if (!document.hidden) {
        renderer.draw({
          ctx,
          size,
          time,
          state: stateRef.current,
          level: levelRef.current(),
          palette: paletteRef.current,
          reducedMotion: reduced,
        });
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [size]);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="no-drag block rounded-full outline-offset-4"
      style={{ width: size, height: size }}
    >
      <canvas ref={canvasRef} style={{ width: size, height: size }} />
    </button>
  );
}
