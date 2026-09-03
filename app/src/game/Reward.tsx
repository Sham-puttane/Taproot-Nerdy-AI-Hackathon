/**
 * What a correct answer GIVES her.
 *
 * There was nothing. The engine recorded the answer, the trail quietly gained
 * a lit stop, and the child got no moment at all -- which is the difference
 * between a game and a worksheet with rounded corners.
 *
 * Deliberately not points and not a streak. The reward is the thing the whole
 * product is about: a fruit lands on her tree, and it is the colour of the
 * grade she just earned it in. That ties the moment to the Grove she will see
 * when she stops playing, so the reward is not spent when it is given -- it is
 * still there on the home screen tomorrow.
 *
 * A miss gets an acknowledgement, never a penalty. There is no score to lose,
 * and the descent treats a wrong answer as information, so the UI says the
 * same thing the engine believes: this told us something.
 */
import { useEffect, useState } from 'react'

const HUE: Record<number, string> = {
  5: '#f8836b', 4: '#ffc94a', 3: '#4fb083',
  2: '#3fbfa0', 1: '#5bb8e8', 0: '#a97ff0',
}

const RIGHT = ['Yes!', 'Got it.', 'That&rsquo;s the one.', 'Nice.']

export function Reward({
  correct,
  grade,
  nth,
}: {
  /** null while nothing has been answered */
  correct: boolean | null
  /** grade the answer was earned in, for the fruit's colour */
  grade: number
  /** bumps on every answer, so a repeat of the same verdict still fires */
  nth: number
}) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (correct === null) return
    setShow(true)
    const t = window.setTimeout(() => setShow(false), correct ? 1500 : 1100)
    return () => window.clearTimeout(t)
  }, [correct, nth])

  if (correct === null || !show) return null

  const hue = HUE[grade] ?? '#ffc94a'

  return (
    <div className={`rw${correct ? ' rw-yes' : ' rw-no'}`} role="status">
      {correct ? (
        <>
          <svg className="rw-art" viewBox="0 0 120 120" aria-hidden="true">
            {/* the burst */}
            {Array.from({ length: 9 }).map((_, i) => {
              const a = (i / 9) * Math.PI * 2
              return (
                <line
                  key={i}
                  className="rw-ray"
                  x1={60 + Math.cos(a) * 26}
                  y1={60 + Math.sin(a) * 26}
                  x2={60 + Math.cos(a) * 48}
                  y2={60 + Math.sin(a) * 48}
                  stroke={hue}
                  strokeWidth="6"
                  strokeLinecap="round"
                  style={{ animationDelay: `${i * 0.014}s` }}
                />
              )
            })}
            {/* the fruit, in the colour of the grade she earned it in */}
            <circle className="rw-fruit" cx="60" cy="62" r="24" fill={hue} />
            <path
              className="rw-leaf"
              d="M60 38c0-11 8-18 17-19-1 11-8 18-17 19z"
              fill="#46c9a4"
            />
          </svg>
          <div className="rw-say">
            <b
              dangerouslySetInnerHTML={{
                __html: RIGHT[nth % RIGHT.length],
              }}
            />
            <span>a fruit for your tree</span>
          </div>
        </>
      ) : (
        <div className="rw-say rw-say-only">
          <b>Not that one.</b>
          <span>Which is useful — now we know where to dig.</span>
        </div>
      )}
    </div>
  )
}
