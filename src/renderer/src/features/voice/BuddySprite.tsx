import { useEffect, useRef } from 'react';
import type { VoiceState } from '@shared/types';
import { pingPong, poseFor, type Pose } from './buddyMath';

const byName = (modules: Record<string, string>): string[] =>
  Object.entries(modules)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, url]) => url);

const STANDING = byName(
  import.meta.glob('../../assets/buddy/standing/*.webp', { eager: true, query: '?url', import: 'default' }),
);
const WAVING = byName(
  import.meta.glob('../../assets/buddy/waving/*.webp', { eager: true, query: '?url', import: 'default' }),
);

const FRAME_W = 366;
const FRAME_H = 432;
const FPS = 15;
const FADE_MS = 160;

const cache = new Map<string, Promise<HTMLImageElement[]>>();

function loadFrames(pose: Pose): Promise<HTMLImageElement[]> {
  const hit = cache.get(pose);
  if (hit) return hit;
  const urls = pose === 'standing' ? STANDING : WAVING;
  const pending = Promise.all(
    urls.map(
      (url) =>
        new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error(`Could not load ${url}`));
          img.src = url;
        }),
    ),
  );
  cache.set(pose, pending);
  return pending;
}

interface BuddySpriteProps {
  state: VoiceState;
  getLevel: () => number;
  /** Height in pixels. Width follows the artwork's proportions. */
  height: number;
}

export default function BuddySprite({ state, getLevel, height }: BuddySpriteProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef(state);
  const levelRef = useRef(getLevel);
  const width = Math.round((height * FRAME_W) / FRAME_H);

  useEffect(() => {
    stateRef.current = state;
    levelRef.current = getLevel;
  }, [state, getLevel]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return undefined;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let cancelled = false;
    let raf = 0;
    let frames: Record<Pose, HTMLImageElement[]> | null = null;
    let pose: Pose = poseFor(stateRef.current);
    let poseStart = performance.now();
    let previous: { img: HTMLImageElement; at: number } | null = null;
    let smoothLevel = 0;

    void Promise.all([loadFrames('standing'), loadFrames('waving')]).then(([standing, waving]) => {
      if (!cancelled) frames = { standing, waving };
    });

    const draw = (img: HTMLImageElement, alpha: number, lift: number, scale: number): void => {
      ctx.globalAlpha = alpha;
      const w = width * scale;
      const h = height * scale;
      ctx.drawImage(img, (width - w) / 2, height - h - lift, w, h);
    };

    const tick = (now: number): void => {
      raf = requestAnimationFrame(tick);
      if (!frames || document.hidden) return;

      const wanted = poseFor(stateRef.current);
      if (wanted !== pose) {
        const list = frames[pose];
        const shown = list[pingPong(Math.floor(((now - poseStart) / 1000) * FPS), list.length)];
        if (shown) previous = { img: shown, at: now };
        pose = wanted;
        poseStart = now;
      }

      const list = frames[pose];
      const step = reduced ? 0 : Math.floor(((now - poseStart) / 1000) * FPS);
      const current = list[pingPong(step, list.length)];
      if (!current) return;

      smoothLevel += (levelRef.current() - smoothLevel) * 0.2;
      const scale = 1 + (reduced ? 0 : smoothLevel * 0.035);

      ctx.clearRect(0, 0, width, height);
      // Soft contact shadow so the figure sits on the screen instead of floating.
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.10)';
      ctx.beginPath();
      ctx.ellipse(width / 2, height - 3, width * 0.26, height * 0.018, 0, 0, Math.PI * 2);
      ctx.fill();

      const fade = previous ? Math.min(1, (now - previous.at) / FADE_MS) : 1;
      if (previous && fade < 1) draw(previous.img, 1 - fade, 0, scale);
      else previous = null;
      draw(current, fade, 0, scale);
      ctx.globalAlpha = 1;
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [width, height]);

  return <canvas ref={canvasRef} style={{ width, height }} aria-hidden="true" />;
}
