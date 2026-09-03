/**
 * "What are you working on?"
 *
 * Four seconds, two taps, no reading test. Deliberately not a placement quiz:
 * a placement quiz is the exact thing this product exists to replace -- forty
 * questions that tell a child what she already knows, which is that she is
 * behind. She does not need to be measured before she is helped. She needs to
 * be asked what she is looking at.
 */
import { useState } from 'react'
import type { Pack } from './pack'
import { GRADES, topicsFor, wallFor, type Topic } from './walls'

export function Pick({
  pack,
  onPick,
  onBack,
}: {
  pack: Pack
  onPick: (wallCode: string) => void
  onBack: () => void
}) {
  const [grade, setGrade] = useState<string | null>(null)
  const topics = grade ? topicsFor(pack, grade) : []

  return (
    <div className="frame">
      <div className="kicker">before we dig</div>

      {!grade ? (
        <>
          <h1 className="say">What grade are you in?</h1>
          <p className="lede">So we start somewhere that fits.</p>
          <div className="grades">
            {GRADES.map((g) => (
              <button key={g} className="grade" onClick={() => setGrade(g)}>
                {g}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <h1 className="say">What are you working on?</h1>
          <p className="lede">Tap the one that looks like your homework.</p>
          {topics.map((t: Topic) => (
            <button
              key={t.id}
              className="tile"
              onClick={() => {
                const code = wallFor(pack, t, grade)
                if (code) onPick(code)
              }}
            >
              <span className="tile-icon" aria-hidden="true">
                {t.icon}
              </span>
              <span>{t.label}</span>
            </button>
          ))}
          <button className="go quiet" onClick={() => setGrade(null)}>
            Change grade
          </button>
        </>
      )}

      <div className="spacer" />
      <button className="go quiet" onClick={onBack}>
        Back to my grove
      </button>
    </div>
  )
}
