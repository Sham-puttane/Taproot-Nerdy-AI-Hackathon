/**
 * 8 and 5 on one side, 6 and WHAT on the other.
 *
 * The first version of this was a counting exercise in a balance costume: one
 * pan held the blocks, the other was empty, and she filled it until the counts
 * matched. She could ignore the beam entirely, count the left pan, and type
 * that number. Nothing about the equals sign was ever tested.
 *
 * The misconception worth attacking is that "=" announces an answer rather
 * than asserting sameness. A child holding the operator view reads
 *
 *     8 + 5 = ? + 6
 *
 * as "eight plus five makes..." and answers 13, or sometimes 19 having added
 * everything in sight. The relational view -- these two collections weigh the
 * same -- gives 7. That gap is well documented and it survives all the way
 * into algebra, where every equation depends on the reading she never formed.
 *
 * You cannot test that with an empty pan. There has to be something ALREADY
 * on her side, so that matching means reasoning about a difference rather than
 * copying a total. So: two groups on the left, one group plus her blocks on
 * the right, and a beam that only levels when the two collections are equal.
 *
 * The beam is now load-bearing. She can see the right pan starts heavy, so
 * "13" is visibly wrong before she counts anything -- which is the whole
 * lesson, delivered by the apparatus rather than by a correction.
 */
import { useState } from 'react'

const MAX = 20

export function Balance({
  a,
  b,
  given,
  onDone,
}: {
  /** the two groups on the left pan */
  a: number
  b: number
  /** what is ALREADY on her side -- the reason this is not counting */
  given: number
  onDone: (correct: boolean) => void
}) {
  const target = a + b
  const need = target - given
  const [added, setAdded] = useState(0)
  const [settled, setSettled] = useState(false)

  const right = given + added
  const diff = right - target
  const level = diff === 0
  const tilt = Math.max(-9, Math.min(9, diff * 1.8))

  return (
    <div className="bal">
      <div className="bal-ask">
        Make both sides <b>weigh the same</b>.
      </div>

      <div className="bal-rig" role="group"
           aria-label={`Balance. Left pan has ${a} and ${b}. Right pan has ` +
                       `${given} already, plus ${added} you added.`}>
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
              {/* Already here. This is what makes the question a question. */}
              {Array.from({ length: given }, (_, i) => (
                <span key={`g${i}`} className="bal-block g4" />
              ))}
              {Array.from({ length: added }, (_, i) => (
                <span key={i}
                      className={`bal-block ${
                        settled ? (level ? 'ok' : 'no') : 'g3'}`} />
              ))}
            </div>
            <div className="bal-num">
              {given} and {added || '?'}
            </div>
          </div>
        </div>
        <div className="bal-post" />
        <div className="bal-base" />
      </div>

      <div className="bal-controls">
        <button className="bal-btn" aria-label="Take one block off"
                disabled={settled || added === 0}
                onClick={() => setAdded((n) => Math.max(0, n - 1))}>
          &minus;
        </button>
        <span className="bal-count">{added}</span>
        <button className="bal-btn" aria-label="Add one block"
                disabled={settled || right >= MAX + given}
                onClick={() => setAdded((n) => n + 1)}>
          +
        </button>
      </div>

      <p className="nl-say">
        {settled
          ? level
            ? `Level. ${a} and ${b} weighs the same as ${given} and ${need}.`
            : `Still tipping. ${given} and ${added} is ${right}, not ${target}.`
          : added === 0
            ? `Your side already has ${given}.`
            : level
              ? 'Level — both sides weigh the same.'
              : diff < 0 ? 'Your side is still too light.'
                         : 'Your side is too heavy now.'}
      </p>

      {added > 0 && !settled && (
        <button className="go"
                onClick={() => { setSettled(true); onDone(level) }}>
          That&rsquo;s balanced
        </button>
      )}
    </div>
  )
}
