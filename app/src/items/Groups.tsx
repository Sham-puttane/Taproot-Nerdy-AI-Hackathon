/**
 * Build the multiplication instead of recalling it.
 *
 * Arrays are the second of the three representations the IES What Works
 * Clearinghouse names, and we had none. They reach 31 of the 101 skills in
 * the pack: multiplying, dividing, equal shares, and area.
 *
 * The point is not that dragging is fun. It is that 4 x 6 stops being a fact
 * to remember and becomes a shape you made -- four rows, six in each, and the
 * total is something you can SEE rather than retrieve. A child who has built
 * it can rebuild it when the fact deserts her, which is exactly what a child
 * who has only memorised it cannot do.
 *
 * The running total is deliberately shown WHILE she builds and not after.
 * Watching it climb by six each time a row lands is the lesson; revealing it
 * at the end would turn the same interaction back into a quiz.
 *
 * Spare on purpose: dots in a grid, one colour. The manipulatives research is
 * clear that decorative detail pulls children off the structure, and the
 * structure here IS the answer.
 */
import { useEffect, useRef, useState } from 'react'

const MAX = 12       // beyond a 12x12 array the dots stop being countable

export function Groups({
  rows,
  cols,
  onDone,
}: {
  /** the array she is being asked to build */
  rows: number
  cols: number
  onDone: (correct: boolean) => void
}) {
  const [r, setR] = useState(0)
  const [c, setC] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [settled, setSettled] = useState(false)
  const padRef = useRef<HTMLDivElement>(null)

  const target = rows * cols
  const built = r * c
  const correct = r === rows && c === cols

  function cellFrom(e: { clientX: number; clientY: number }) {
    const box = padRef.current?.getBoundingClientRect()
    if (!box) return null
    const cw = box.width / MAX
    const ch = box.height / MAX
    return {
      c: Math.min(MAX, Math.max(1, Math.ceil((e.clientX - box.left) / cw))),
      r: Math.min(MAX, Math.max(1, Math.ceil((e.clientY - box.top) / ch))),
    }
  }

  useEffect(() => {
    if (!dragging) return
    const move = (e: PointerEvent) => {
      const cell = cellFrom(e)
      if (cell) { setR(cell.r); setC(cell.c) }
    }
    const up = () => setDragging(false)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
  }, [dragging])

  function onKey(e: React.KeyboardEvent) {
    if (settled) return
    const step = (dr: number, dc: number) => {
      setR((x) => Math.min(MAX, Math.max(0, x + dr)))
      setC((x) => Math.min(MAX, Math.max(0, x + dc)))
      e.preventDefault()
    }
    if (e.key === 'ArrowDown') step(1, 0)
    if (e.key === 'ArrowUp') step(-1, 0)
    if (e.key === 'ArrowRight') step(0, 1)
    if (e.key === 'ArrowLeft') step(0, -1)
  }

  return (
    <div className="gr">
      <div className="gr-ask">
        Drag out <b>{rows}</b> {rows === 1 ? 'row' : 'rows'} of <b>{cols}</b>.
      </div>

      <div
        ref={padRef}
        tabIndex={0}
        onKeyDown={onKey}
        onPointerDown={(e) => {
          if (settled) return
          const cell = cellFrom(e)
          if (cell) { setR(cell.r); setC(cell.c) }
          setDragging(true)
        }}
        className="gr-pad"
        role="group"
        aria-label={
          `Grid up to ${MAX} by ${MAX}. Drag to build ${rows} rows of ${cols}. ` +
          `Currently ${r} rows of ${c}.`
        }
        style={{ cursor: settled ? 'default' : 'crosshair' }}
      >
        {Array.from({ length: MAX * MAX }, (_, i) => {
          const rr = Math.floor(i / MAX) + 1
          const cc = (i % MAX) + 1
          const on = rr <= r && cc <= c
          return (
            <span
              key={i}
              className={`gr-dot${on ? ' on' : ''}${
                settled && on ? (correct ? ' right' : ' wrong') : ''
              }`}
            />
          )
        })}
      </div>

      <div className="gr-count">
        {r > 0 && c > 0 ? (
          <>
            <b>{r}</b> rows of <b>{c}</b>
            <span className="gr-eq">=</span>
            <b className="gr-total">{built}</b>
          </>
        ) : (
          <span className="gr-hint">Drag across and down. Arrow keys work too.</span>
        )}
      </div>

      <p className="nl-say">
        {settled
          ? correct
            ? `Yes — ${rows} rows of ${cols} is ${target}.`
            : `That is ${r} of ${c}. You were asked for ${rows} of ${cols}.`
          : r > 0 && c > 0 && !correct && built === target
            ? 'That is the right total, but not the array you were asked for.'
            : ''}
      </p>

      {r > 0 && c > 0 && !settled && (
        <button
          className="go"
          onClick={() => { setSettled(true); onDone(correct) }}
        >
          That&rsquo;s it
        </button>
      )}
    </div>
  )
}
