import { useEffect, useRef } from 'react';
import type { VoiceState } from '@shared/types';
import { frameAt, targetWave } from './skinMotion';

interface SvgSkinProps {
  /** Markup of a skin following the format in docs/ADDING_SKINS.md. Always bundled with the app, never user input. */
  svg: string;
  state: VoiceState;
  getLevel: () => number;
  height: number;
}

const ASPECT = 240 / 300;

interface Part {
  el: SVGGElement;
  px: number;
  py: number;
  rest: number;
  wave: number;
  closed: number;
  phase: number;
}

const num = (v: string | null, fallback: number): number =>
  v === null || v === '' || Number.isNaN(Number(v)) ? fallback : Number(v);

function readPart(el: SVGGElement): Part {
  const [px, py] = (el.getAttribute('data-pivot') ?? '0 0').split(/\s+/).map(Number);
  return {
    el,
    px: px ?? 0,
    py: py ?? 0,
    rest: num(el.getAttribute('data-rest'), 0),
    wave: num(el.getAttribute('data-wave'), 0),
    closed: num(el.getAttribute('data-closed'), 0.3),
    phase: num(el.getAttribute('data-phase'), 0),
  };
}

const rotate = (p: Part, deg: number): string => `rotate(${deg.toFixed(2)} ${p.px} ${p.py})`;
const scaleAbout = (p: Part, sx: number, sy: number): string =>
  `translate(${p.px} ${p.py}) scale(${sx.toFixed(3)} ${sy.toFixed(3)}) translate(${-p.px} ${-p.py})`;

/**
 * Plays a vector character. The artwork is a plain SVG whose groups are named with data-part, and this
 * component moves them: breathing, blinking, head tilt, a waving arm, swaying hair and a talking mouth.
 */
export default function SvgSkin({ svg, state, getLevel, height }: SvgSkinProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef(state);
  const levelRef = useRef(getLevel);
  const width = Math.round(height * ASPECT);

  useEffect(() => {
    stateRef.current = state;
    levelRef.current = getLevel;
  }, [state, getLevel]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    host.innerHTML = svg; // trusted: bundled artwork only
    const root = host.querySelector('svg');
    if (!root) return undefined;
    root.setAttribute('width', String(width));
    root.setAttribute('height', String(height));

    const find = (name: string): Part | null => {
      const el = root.querySelector<SVGGElement>(`[data-part="${name}"]`);
      return el ? readPart(el) : null;
    };
    const figure = find('figure');
    const head = find('head');
    const armR = find('armR');
    const armL = find('armL');
    const eyes = find('eyes');
    const mouth = find('mouth');
    const sways = [...root.querySelectorAll<SVGGElement>('[data-part="sway"]')].map(readPart);

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let wave = 0;
    let smoothLevel = 0;
    let mouthOpen = 0;
    let raf = 0;
    let last = 0;
    const start = performance.now();

    const tick = (now: number): void => {
      raf = requestAnimationFrame(tick);
      if (document.hidden || now - last < 33) return; // about 30 fps is plenty for a mascot
      last = now;

      const t = (now - start) / 1000;
      wave += (targetWave(stateRef.current) - wave) * 0.12;
      smoothLevel += (levelRef.current() - smoothLevel) * 0.35;
      const f = frameAt(reduced ? 0 : t, reduced ? 0 : wave, stateRef.current, smoothLevel);

      if (figure)
        figure.el.setAttribute(
          'transform',
          `translate(0 ${f.bob.toFixed(2)}) ${scaleAbout(figure, 1, f.breath)}`,
        );
      if (head) head.el.setAttribute('transform', rotate(head, f.headTilt));
      if (armR) armR.el.setAttribute('transform', rotate(armR, f.armRAngle(armR.rest, armR.wave)));
      if (armL) armL.el.setAttribute('transform', rotate(armL, f.armLAngle(armL.rest)));
      for (const s of sways) s.el.setAttribute('transform', rotate(s, f.sway(s.phase)));
      if (eyes) eyes.el.setAttribute('transform', scaleAbout(eyes, 1, f.blink));
      if (mouth) {
        mouthOpen += (f.mouth(mouth.closed) - mouthOpen) * 0.5;
        mouth.el.setAttribute('transform', scaleAbout(mouth, 1, Math.max(0.15, mouthOpen)));
      }
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      host.innerHTML = '';
    };
  }, [svg, width, height]);

  return <div ref={hostRef} style={{ width, height }} aria-hidden="true" />;
}
