/**
 * Where she is in the session.
 *
 * Named SessionProgress, not Progress: game/progress.ts already exists and on
 * a case-insensitive filesystem the two resolve to each other, which fails at
 * build time with a message about casing rather than about the collision.
 *
 * The loop has always had five named beats and never showed her any of them.
 * From inside, a descent is an unbounded sequence of questions with no visible
 * end -- which is exactly what "why do I keep getting questions" feels like,
 * and it was a fair complaint about the interface rather than the engine.
 *
 * So: the five beats, the one she is in, and the ones behind her filled. Not a
 * percentage, because the descent genuinely does not know how many questions
 * it needs -- claiming "60% done" would be a number we invented. What it can
 * honestly show is WHICH PART she is in, and that the parts are finite.
 */

const BEATS = [
  { key: 'wall', label: 'The problem', hue: '#f8836b' },
  { key: 'descent', label: 'Digging', hue: '#f5b625' },
  { key: 'bedrock', label: 'Found it', hue: '#a06ee1' },
  { key: 'repair', label: 'Fixing', hue: '#4fb083' },
  { key: 'climb', label: 'Climbing back', hue: '#5bb8e8' },
] as const

/** Phases that are really the same beat wearing a different name. */
const ALIAS: Record<string, string> = {
  nowall: 'wall',
  cascade: 'repair',
  return: 'climb',
  done: 'climb',
}

export function SessionProgress({
  phase,
  asked,
}: {
  phase: string
  /** how many questions so far -- shown as a fact, never as a target */
  asked: number
}) {
  const key = ALIAS[phase] ?? phase
  const at = BEATS.findIndex((b) => b.key === key)
  const here = at < 0 ? 0 : at

  return (
    <div className="sp" role="group" aria-label={`Step ${here + 1} of 5`}>
      <ol className="sp-track">
        {BEATS.map((b, i) => {
          const state = i < here ? 'done' : i === here ? 'now' : 'ahead'
          return (
            <li key={b.key} className={`sp-beat ${state}`}
                style={{ ['--bh' as string]: b.hue }}>
              <span className="sp-dot">
                {state === 'done' ? '✓' : i + 1}
              </span>
              <span className="sp-label">{b.label}</span>
            </li>
          )
        })}
      </ol>
      <div className="sp-count">
        {asked === 0
          ? 'no score, no timer'
          : `${asked} ${asked === 1 ? 'question' : 'questions'} so far · no score, no timer`}
      </div>
    </div>
  )
}
