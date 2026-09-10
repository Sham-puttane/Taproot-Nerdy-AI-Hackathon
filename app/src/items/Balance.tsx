/**
 * Make both sides the same.
 *
 * This one exists to attack a specific, very well documented misconception:
 * children read "=" as "and here comes the answer" rather than "these two
 * amounts are the same". A child who believes the first will happily write
 * 8 + 5 = 13 + 6, and will keep believing it right through algebra.
 *
 * A balance beam cannot express "and here comes the answer". It can only
 * express sameness, and it tips until you have it. That is the entire design:
 * the feedback is not a tick, it is the beam going level.
 *
 * The left pan holds the two groups being added, kept visually separate so
 * she can see the parts inside the whole -- that separation IS the number
 * bond. The right pan she fills herself.
 *
 * Spare on purpose, like the other instruments: blocks, a beam, no scenery.
 * Perceptual detail measurably pulls children off the structure.
 */
import { useState } from 'react'

const MAX = 20

export function Balance({
  a,
  b,
  onDone,
}: {
  /** the two groups on the left pan */
  a: number
  b: number
  onDone: (correct: boolean) => void
}) {
  const total = a + b
  const [right, setRight] = useState(0)
  const [settled, setSettled] = useState(false)

  const diff = right - total
  const level = diff === 0
  // Tip is capped so a wild answer does not throw the beam off screen.
  const tilt = Math.max(-9, Math.min(9, diff * 1.8))

  return (
    <div className="bal">
      <div className="bal-ask">
        Put blocks on the right until both sides <b>match</b>.
      </div>

      <div className="bal-rig" role="group"
           aria-label={`Balance. Left pan has ${a} and ${b}. Right pan has ${right}.`}>
        <div className="bal-beam" style={{ transform: `rotate(${tilt}deg)` }}>
          <div className="bal-pan bal-left">
            <div className="bal-blocks">
              {Array.from({ length: a }, (_, i) => (
                <span key={`a${i}`} className="bal-block g1" />
              ))}
              {Array.from({ length: b }, (_, i) => (
                <span key={`b${i}`} className="bal-block g2" />
              ))}
            </div>
            <div className="bal-num">{a} and {b}</div>
          </div>

          <div className="bal-pan bal-right">
            <div className="bal-blocks">
              {Array.from({ length: right }, (_, i) => (
                <span key={i}
                      className={`bal-block ${
                        settled ? (level ? 'ok' : 'no') : 'g3'}`} />
              ))}
            </div>
            <div className="bal-num">{right || '?'}</div>
          </div>
        </div>
        <div className="bal-post" />
        <div className="bal-base" />
      </div>

      <div className="bal-controls">
        <button
          className="bal-btn"
          aria-label="Take one block off"
          disabled={settled || right === 0}
          onClick={() => setRight((n) => Math.max(0, n - 1))}
        >
          &minus;
        </button>
        <span className="bal-count">{right}</span>
        <button
          className="bal-btn"
          aria-label="Add one block"
          disabled={settled || right >= MAX}
          onClick={() => setRight((n) => Math.min(MAX, n + 1))}
        >
          +
        </button>
      </div>

      <p className="nl-say">
        {settled
          ? level
            ? `Level. ${a} and ${b} really is the same as ${total}.`
            : `Still tipping. ${right} is not the same as ${a} and ${b}.`
          : right === 0
            ? ''
            : level
              ? 'Level — both sides are the same.'
              : diff < 0 ? 'The right side is too light.'
                         : 'The right side is too heavy.'}
      </p>

      {right > 0 && !settled && (
        <button className="go"
                onClick={() => { setSettled(true); onDone(level) }}>
          That&rsquo;s balanced
        </button>
      )}
    </div>
  )
}
