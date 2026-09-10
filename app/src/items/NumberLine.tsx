/**
 * Put a number where it belongs on the line.
 *
 * The IES What Works Clearinghouse guides do not say "be visual". They name
 * three representations, and they single out the number line as "a central
 * representational tool in teaching fraction concepts from the early grades
 * onward". It is the highest-evidence thing we can build, and it reaches 38
 * of the 101 skills in the pack -- more than any other instrument.
 *
 * This generalises the old `Place`, which only knew about fractions between 0
 * and 1. The same line now carries whole numbers, fractions and decimals, so
 * one instrument serves place value, rounding, comparing and tenths instead
 * of one skill.
 *
 * Deliberately spare: a line, ticks, a marker. Kaminski and Sloutsky found
 * that irrelevant perceptual detail pulls children off the concept, and that
 * concrete decoration binds an idea to one context so it transfers worse. So
 * there is no cartoon, no texture, and nothing on the line that is not part
 * of the mathematics.
 *
 * Snapping to ticks keeps this about placement rather than fine motor
 * control, which is not the skill being assessed.
 */
import { useEffect, useRef, useState } from 'react'

/** "3/4" | "0.7" | "35" -> a number, or null if it is not one. */
function toNumber(text: string): number | null {
  const s = text.trim()
  const frac = /^(-?\d+)\s*\/\s*(\d+)$/.exec(s)
  if (frac) {
    const d = Number(frac[2])
    return d === 0 ? null : Number(frac[1]) / d
  }
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

/** Labels only at the ends and at whole steps -- never on the answer. */
function labelFor(i: number, ticks: number, min: number, max: number): string | null {
  if (i === 0) return String(min)
  if (i === ticks) return String(max)
  // A long line gets a midpoint so it is readable; a short one does not need
  // one, and on a 0-1 fraction line a midpoint label would give away halves.
  if (ticks >= 8 && i === Math.floor(ticks / 2) && Number.isInteger((min + max) / 2)) {
    return String((min + max) / 2)
  }
  return null
}

export function NumberLine({
  value,
  ticks,
  min = 0,
  max = 1,
  onDone,
}: {
  /** where it should go, as the child would write it */
  value: string
  /** how many equal divisions the line is cut into */
  ticks: number
  min?: number
  max?: number
  onDone: (correct: boolean) => void
}) {
  const target = toNumber(value)
  const span = max - min
  const targetTick =
    target === null ? 0 : Math.round(((target - min) / span) * ticks)

  const [tick, setTick] = useState<number | null>(null)
  const [dragging, setDragging] = useState(false)
  const [settled, setSettled] = useState(false)
  const lineRef = useRef<HTMLDivElement>(null)

  function tickFrom(e: { clientX: number }): number {
    const r = lineRef.current?.getBoundingClientRect()
    if (!r) return 0
    const p = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))
    return Math.round(p * ticks)
  }

  useEffect(() => {
    if (!dragging) return
    const move = (e: PointerEvent) => setTick(tickFrom(e))
    const up = () => setDragging(false)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging, ticks])

  // Keyboard: a child on a school Chromebook may not have a usable pointer,
  // and the arrow keys are the natural way to step along a number line.
  function onKey(e: React.KeyboardEvent) {
    if (settled) return
    const cur = tick ?? Math.round(ticks / 2)
    if (e.key === 'ArrowLeft') { setTick(Math.max(0, cur - 1)); e.preventDefault() }
    if (e.key === 'ArrowRight') { setTick(Math.min(ticks, cur + 1)); e.preventDefault() }
  }

  const correct = tick === targetTick
  const pct = ((tick ?? 0) / ticks) * 100
  const wholeSteps = Number.isInteger(span / ticks)

  return (
    <div className="nl">
      <div
        ref={lineRef}
        tabIndex={0}
        onKeyDown={onKey}
        onPointerDown={(e) => {
          if (settled) return
          setTick(tickFrom(e))
          setDragging(true)
        }}
        role="group"
        aria-label={
          `Number line from ${min} to ${max} with ${ticks} divisions. ` +
          `Place ${value}.`
        }
        className="nl-line"
        style={{ cursor: settled ? 'default' : 'pointer' }}
      >
        <div className="nl-rule" />

        {Array.from({ length: ticks + 1 }, (_, i) => {
          const label = labelFor(i, ticks, min, max)
          const major = label !== null
          return (
            <div key={i}>
              <div
                className={`nl-tick${major ? ' major' : ''}`}
                style={{ left: `calc(${(i / ticks) * 100}% - 1px)` }}
              />
              {major && (
                <span className="nl-label"
                      style={{ left: `${(i / ticks) * 100}%` }}>
                  {label}
                </span>
              )}
            </div>
          )
        })}

        {tick !== null && (
          <button
            aria-label={`Marker at division ${tick} of ${ticks}`}
            onPointerDown={(e) => {
              e.stopPropagation()
              if (!settled) setDragging(true)
            }}
            className="nl-marker"
            style={{ left: `calc(${pct}% - 30px)`,
                     cursor: settled ? 'default' : 'grab' }}
          >
            <span
              className="nl-chip"
              style={{
                background: settled
                  ? correct ? 'var(--leaf)' : 'var(--wrong)'
                  : 'var(--glow)',
              }}
            >
              {value}
            </span>
            <span className="nl-stem" />
          </button>
        )}
      </div>

      <p className="nl-say">
        {tick === null
          ? 'Tap the line to drop it, then slide it.'
          : settled
            ? correct
              ? 'That is exactly where it goes.'
              : wholeSteps
                ? 'Not quite — count the jumps from ' + min + '.'
                : 'Not quite — count the equal parts from ' + min + '.'
            : 'Slide it to the right spot. Arrow keys work too.'}
      </p>

      {tick !== null && !settled && (
        <button
          className="go"
          onClick={() => { setSettled(true); onDone(correct) }}
        >
          Put it there
        </button>
      )}
    </div>
  )
}
