/**
 * Put a fraction on the number line — by dragging it there.
 *
 * 3.NF.A.2 is the moment a fraction stops being a shaded pizza and becomes a
 * NUMBER. That shift is spatial, so the item is too. Snapping to ticks keeps
 * it about placement rather than fine motor control, which is not the skill
 * being assessed.
 */
import { useEffect, useRef, useState } from 'react'

export function Place({
  value,
  ticks,
  onDone,
}: {
  value: string
  ticks: number
  onDone: (correct: boolean) => void
}) {
  const [num, den] = value.split('/').map(Number)
  const targetTick = Math.round((num / den) * ticks)

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
  }, [dragging])

  const correct = tick === targetTick
  const pct = ((tick ?? 0) / ticks) * 100

  return (
    <div>
      <div
        ref={lineRef}
        onPointerDown={(e) => {
          if (settled) return
          setTick(tickFrom(e))
          setDragging(true)
        }}
        role="group"
        aria-label={`Number line from 0 to 1 with ${ticks} divisions. Place ${value}.`}
        style={{
          position: 'relative',
          height: 84,
          marginTop: 6,
          touchAction: 'none',
          cursor: settled ? 'default' : 'pointer',
        }}
      >
        {/* the line */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 44,
            height: 4,
            borderRadius: 2,
            background: 'var(--edge)',
          }}
        />
        {/* ticks — unlabelled except the ends, or it gives the answer away */}
        {Array.from({ length: ticks + 1 }, (_, i) => (
          <div key={i}>
            <div
              style={{
                position: 'absolute',
                left: `calc(${(i / ticks) * 100}% - 1px)`,
                top: i === 0 || i === ticks ? 34 : 38,
                width: 2,
                height: i === 0 || i === ticks ? 24 : 16,
                background: 'var(--ink-faint)',
              }}
            />
            {(i === 0 || i === ticks) && (
              <span
                style={{
                  position: 'absolute',
                  left: `${(i / ticks) * 100}%`,
                  transform: 'translateX(-50%)',
                  top: 62,
                  fontSize: 15,
                  color: 'var(--ink-dim)',
                }}
              >
                {i === 0 ? '0' : '1'}
              </span>
            )}
          </div>
        ))}

        {tick !== null && (
          <button
            aria-label={`Marker at ${tick} of ${ticks}`}
            onPointerDown={(e) => {
              e.stopPropagation()
              if (!settled) setDragging(true)
            }}
            style={{
              position: 'absolute',
              left: `calc(${pct}% - 26px)`,
              top: 2,
              width: 52,
              height: 58,
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: settled ? 'default' : 'grab',
              touchAction: 'none',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                padding: '5px 9px',
                borderRadius: 10,
                fontSize: 16,
                background: settled
                  ? correct
                    ? 'var(--leaf)'
                    : 'var(--wrong)'
                  : 'var(--glow)',
                color: '#2f2a1f',
                boxShadow: 'var(--shadow)',
              }}
            >
              {value}
            </span>
            <span
              style={{
                display: 'block',
                width: 3,
                height: 16,
                margin: '2px auto 0',
                background: 'var(--ink)',
              }}
            />
          </button>
        )}
      </div>

      <p style={{ fontSize: 14, color: 'var(--ink-dim)', margin: '4px 0 0' }}>
        {tick === null
          ? 'Tap the line to drop it, then slide it.'
          : settled
            ? correct
              ? 'That is exactly where it goes.'
              : 'Not quite — count the jumps from 0.'
            : 'Slide it to the right spot.'}
      </p>

      {tick !== null && !settled && (
        <button
          className="go"
          onClick={() => {
            setSettled(true)
            onDone(correct)
          }}
        >
          Put it there
        </button>
      )}
    </div>
  )
}
