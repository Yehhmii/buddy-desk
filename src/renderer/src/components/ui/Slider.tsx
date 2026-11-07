interface SliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  label: string;
}

export default function Slider({ value, min, max, step = 1, onChange, label }: SliderProps) {
  return (
    <input
      type="range"
      aria-label={label}
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="no-drag h-1 w-40 cursor-pointer accent-[var(--accent)]"
    />
  );
}
