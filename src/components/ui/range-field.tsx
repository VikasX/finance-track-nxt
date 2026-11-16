/*
 * src/components/ui/range-field.tsx
 * Pairs a numeric input with a slider for the calculator sections. The parent owns the numeric value, so either control updates the same calculation.
 * "use client" marks the browser-interactive entry point: hooks/events or browser APIs
 * need JavaScript after hydration. Next may still prerender its initial HTML on the server.
 * Beginner syntax: @/ means src/ (tsconfig paths); import type is compile-time only.
 */
"use client";
// Expose one numeric value through both input and slider. onChange is a parent callback, so calculator state remains in the owning page.
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
  // HTML inputs provide text even for numeric controls. Convert, reject non-finite input, and clamp to the supported range before notifying the parent calculator.
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
        {/* Turn matching items into JSX with map. Each repeated element needs a stable key so React preserves the right row/control when data changes. */}
        {ticks.map((tick) => (
          <span key={tick}>{tick}</span>
        ))}
      </div>
    </div>
  );
}
