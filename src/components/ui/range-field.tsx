"use client";
export function RangeField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix = "",
  ticks,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  ticks: string[];
}) {
  function update(raw: string) {
    const next = Number(raw);
    if (Number.isFinite(next)) onChange(Math.max(min, Math.min(max, next)));
  }
  return (
    <div className="range-field">
      <label htmlFor={`number-${label}`}>{label}</label>
      <div className="relative">
        <input
          id={`number-${label}`}
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => update(e.target.value)}
        />
        <span className="absolute right-4 top-3.5 text-xs muted">{suffix}</span>
      </div>
      <input
        aria-label={`${label} slider`}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => update(e.target.value)}
      />
      <div className="range-labels">
        {ticks.map((tick) => (
          <span key={tick}>{tick}</span>
        ))}
      </div>
    </div>
  );
}
