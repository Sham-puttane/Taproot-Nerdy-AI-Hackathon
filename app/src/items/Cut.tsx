/**
 * Cut the bar into n equal pieces — with your finger.
 *
 * This is the instrument 3.NF.A.1 actually asks for. A child can pick the
 * right picture out of four while still believing that any four pieces make
 * quarters; she cannot fake it while placing the cuts herself. The feedback is
 * live and spatial — pieces glow green as they even out — so "equal" is
 * something she feels rather than something she is told.
 */
import { useEffect, useRef, useState } from 'react'

export function Cut({
  target,
  tolerance = 0.06,
  onDone,
}: {
  target: number
  tolerance?: number
  onDone: (correct: boolean) => void
}) {
  const [cuts, setCuts] = useState<number[]>([])
  const [drag, setDrag] = useState<number | null>(null)
  const [settled, setSettled] = useState(false)
  const barRef = useRef<HTMLDivElement>(null)

  const needed = target - 1
  const sorted = [...cuts].sort((a, b) => a - b)
  const widths = [...sorted, 1].map((edge, i) => edge - (i ? sorted[i - 1] : 0))
  const ideal = 1 / target
  const worst = widths.length
    ? Math.max(...widths.map((w) => Math.abs(w - ideal)))
    : 1
  const even = cuts.length === needed && worst <= tolerance

  function xFrom(e: { clientX: number }): number {
    const r = barRef.current?.getBoundingClientRect()
    if (!r) return 0
    return Math.min(0.97, Math.max(0.03, (e.clientX - r.left) / r.width))
  }

  function addCut(e: React.PointerEvent) {
    if (settled) return
    const x = xFrom(e)
    // Functional update, not `setCuts([...cuts, x])`. Two taps landing before
    // a re-render both read the same stale `cuts` and the second one is lost --
    // which is exactly what an excited eight-year-old does to a bar that needs
    // three cuts.
    setCuts((prev) => (prev.length >= needed ? prev : [...prev, x]))
  }

  useEffect(() => {
    if (drag === null) return
    const move = (e: PointerEvent) => {
      setCuts((c) => c.map((v, i) => (i === drag ? xFrom(e) : v)))
    }
    const up = () => setDrag(null)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
  }, [drag])

  const colours = ['--glow', '--leaf', '--lilac', '--glow', '--leaf', '--lilac']

  return (
    <div>
      <div
        ref={barRef}
        onPointerDown={addCut}
        role="group"
        aria-label={`Bar to cut into ${target} equal pieces. ${cuts.length} of ${needed} cuts placed.`}
        style={{
          position: 'relative',
          height: 88,
          borderRadius: 16,
          background: 'var(--raised)',
          border: '2px solid var(--edge)',
          overflow: 'hidden',
          cursor: cuts.length < needed && !settled ? 'copy' : 'default',
          touchAction: 'none',
        }}
      >
        {[...sorted, 1].map((edge, i) => {
          const from = i ? sorted[i - 1] : 0
          const w = edge - from
          const close = Math.abs(w - ideal) <= tolerance
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: `${from * 100}%`,
                width: `${w * 100}%`,
                top: 0,
                bottom: 0,
                background:
                  cuts.length === needed
                    ? close
                      ? 'var(--leaf-soft)'
                      : 'var(--wrong-soft)'
                    : `color-mix(in srgb, var(${colours[i % colours.length]}) 22%, transparent)`,
                borderRight: i < sorted.length ? '2px solid var(--ink)' : 'none',
                transition: 'background .25s ease',
              }}
            />
          )
        })}

        {sorted.map((x, i) => (
          <button
            key={i}
            aria-label={`Move cut ${i + 1}`}
            onPointerDown={(e) => {
              e.stopPropagation()
              setDrag(cuts.indexOf(x))
            }}
            style={{
              position: 'absolute',
              left: `calc(${x * 100}% - 16px)`,
              top: 0,
              width: 32,
              height: '100%',
              background: 'transparent',
              border: 'none',
              cursor: 'ew-resize',
              touchAction: 'none',
              padding: 0,
            }}
          >
            <span
              style={{
                display: 'block',
                width: 6,
                height: 30,
                margin: '0 auto',
                borderRadius: 3,
                background: 'var(--ink)',
                boxShadow: '0 0 0 3px var(--card)',
              }}
            />
          </button>
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginTop: 12,
          fontSize: 14,
          color: 'var(--ink-dim)',
        }}
      >
        <span>
          {cuts.length < needed
            ? `Tap to add a cut — ${needed - cuts.length} to go`
            : even
              ? 'Those look equal.'
              : 'Close. Drag the cuts until the pieces match.'}
        </span>
        {cuts.length > 0 && !settled && (
          <button
            className="go quiet"
            style={{ width: 'auto', margin: 0, padding: '7px 12px', fontSize: 14 }}
            onClick={() => setCuts([])}
          >
            Start over
          </button>
        )}
      </div>

      {cuts.length === needed && !settled && (
        <button
          className="go"
          onClick={() => {
            setSettled(true)
            onDone(even)
          }}
        >
          {even ? 'Done' : 'Check my cuts'}
        </button>
      )}
    </div>
  )
}
