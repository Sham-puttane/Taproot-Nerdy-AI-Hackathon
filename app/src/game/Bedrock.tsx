/**
 * "It was never about fractions."
 *
 * This is the sentence the whole product exists to be able to say, and it was
 * being delivered as a small card floating in a wide empty column -- the
 * emotional peak of the descent, styled like a form field.
 *
 * What makes the moment land is not the name of the skill. It is the DISTANCE:
 * she came in stuck on a grade-5 problem and the thing actually broken is five
 * grades below it, in kindergarten. So the drop is drawn, at the same scale
 * and in the same strata she has been digging through for ten questions, and
 * the two ends are labelled with what she was doing and what was really wrong.
 *
 * The confidence is shown rather than hidden. The engine names a gap it is
 * exactly right about roughly seven times in ten, and a child old enough to
 * read "we think" is old enough to be told the truth about it.
 */
import type { PackNode } from './pack'
import { kidName } from './pack'

const HUE: Record<number, string> = {
  5: '#f8836b', 4: '#ffc94a', 3: '#4fb083',
  2: '#3fbfa0', 1: '#5bb8e8', 0: '#a97ff0',
}
const BAND: Record<number, string> = {
  5: '#ffe0a0', 4: '#f0c477', 3: '#d9a758',
  2: '#b8863c', 1: '#8a5a28', 0: '#6b4520',
}
const gnum = (g?: string) => (g === 'K' ? 0 : Number(g) || 0)
const gradeWord = (g: string) => (g === 'K' ? 'kindergarten' : `grade ${g}`)

/** Trim at a word boundary. Cutting mid-word reads as a rendering fault. */
function fit(text: string, chars: number): string {
  if (text.length <= chars) return text
  const cut = text.slice(0, chars)
  const space = cut.lastIndexOf(' ')
  return (space > chars * 0.6 ? cut.slice(0, space) : cut).trimEnd() + '…'
}

export function Bedrock({
  wall,
  gap,
  confidence,
  questions,
  topic,
  onFix,
  onGrownup,
}: {
  wall: PackNode | undefined
  gap: PackNode | undefined
  confidence: number
  questions: number
  /** what she said she was working on, in her words */
  topic: string
  onFix: () => void
  onGrownup: () => void
}) {
  if (!gap) {
    return (
      <div className="bd">
        <div className="kicker">nothing clearly broken</div>
        <h1 className="bd-title">We could not pin it down.</h1>
        <p className="bd-lede">
          {questions} questions were not enough to be sure, so we are not going
          to guess and send you to fix something that might be fine. Another go
          usually settles it.
        </p>
      </div>
    )
  }

  const wg = gnum(wall?.grade)
  const bg = gnum(gap.grade)
  const drop = Math.max(0, wg - bg)
  const bands = []
  for (let g = 5; g >= 0; g--) bands.push(g)

  const H = 42
  const yOf = (g: number) => (5 - g) * H + H / 2
  const x = 96

  return (
    <div className="bd">
      <div className="kicker">found it</div>
      <h1 className="bd-title">
        {drop > 0
          ? <>It was never about {topic}.</>
          : <>Here is the tricky bit.</>}
      </h1>
      <p className="bd-lede">
        {drop > 0 ? (
          <>
            You got stuck {wall ? gradeWord(wall.grade) : 'up here'}. The thing
            that is actually broken is{' '}
            <b>{drop} {drop === 1 ? 'grade' : 'grades'} further down</b>.
          </>
        ) : (
          <>This is the idea underneath the one that beat you.</>
        )}
      </p>

      {/* the drop, in the same ground she has been digging through */}
      <svg className="bd-drop" viewBox={`0 0 560 ${bands.length * H}`}
           role="img"
           aria-label={
             `You were stuck at ${wall ? gradeWord(wall.grade) : 'the top'}; ` +
             `the gap is at ${gradeWord(gap.grade)}`}>
        {bands.map((g, i) => (
          <g key={g}>
            <rect x="0" y={i * H} width="560" height={H} fill={BAND[g]}
                  opacity={g <= wg && g >= bg ? 1 : 0.35} />
            <text x="10" y={i * H + 26} fontSize="11" fontWeight="600"
                  letterSpacing="1.3" fill={g >= 3 ? '#7a6330' : '#e8d7b8'}
                  fontFamily="'IBM Plex Mono', ui-monospace, monospace">
              {g === 0 ? 'K' : `GR ${g}`}
            </text>
          </g>
        ))}

        {/* the root joining what she tried to what was really wrong */}
        <path
          d={`M${x - 6} ${yOf(wg)} C${x - 6} ${(yOf(wg) + yOf(bg)) / 2},
              ${x - 11} ${(yOf(wg) + yOf(bg)) / 2}, ${x - 1} ${yOf(bg)}
              C${x + 11} ${(yOf(wg) + yOf(bg)) / 2},
              ${x + 6} ${(yOf(wg) + yOf(bg)) / 2}, ${x + 6} ${yOf(wg)} Z`}
          fill="#7a4a1c" opacity=".6"
        />

        <circle cx={x} cy={yOf(wg)} r="13" fill="#fdf6e8"
                stroke={HUE[wg]} strokeWidth="4" />
        <text x={x + 24} y={yOf(wg) + 1} fontSize="13" fill="#3b2a12">
          {wall ? fit(kidName(wall), 46) : 'where you got stuck'}
        </text>
        <text x={x + 24} y={yOf(wg) + 15} fontSize="9" letterSpacing="1.1"
              fill="rgba(59,42,18,.62)"
              fontFamily="'IBM Plex Mono', ui-monospace, monospace">
          WHERE YOU GOT STUCK
        </text>

        <circle className="bd-pulse" cx={x} cy={yOf(bg)} r="16"
                fill={HUE[bg]} stroke="#16233a" strokeWidth="3" />
        <text x={x + 26} y={yOf(bg)} fontSize="14" fontWeight="600"
              fill={bg >= 3 ? '#3b2a12' : '#fdf6e8'}>
          {fit(kidName(gap), 44)}
        </text>
        <text x={x + 26} y={yOf(bg) + 14} fontSize="9" letterSpacing="1.1"
              fill={bg >= 3 ? 'rgba(59,42,18,.62)' : 'rgba(253,246,232,.75)'}
              fontFamily="'IBM Plex Mono', ui-monospace, monospace">
          THIS IS THE ONE
        </text>
      </svg>

      {gap.reteach && (
        <div className="bd-coach">
          <span className="bd-coach-tag">what actually helps</span>
          {gap.reteach}
        </div>
      )}

      <div className="bd-facts">
        <span><b>{questions}</b> questions</span>
        <span><b>{Math.round(confidence * 100)}%</b> sure</span>
        <span><b>{gradeWord(gap.grade)}</b></span>
      </div>

      <div className="bd-actions">
        <button className="go bd-fix" onClick={onFix}>Fix it</button>
        <button className="go quiet" onClick={onGrownup}>For a grown-up</button>
      </div>
    </div>
  )
}
