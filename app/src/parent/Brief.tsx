/**
 * What the grown-up gets.
 *
 * Deliberately not a score. A parent already knows she is struggling with
 * fractions -- that is why they are here. What they cannot get anywhere else
 * is WHERE it broke, WHAT was actually asked, and WHETHER practice will fix
 * it or she needs a person.
 *
 * The runners-up are shown rather than hidden. The engine declines to name a
 * gap on about one learner in twenty, and even when it does name one it is
 * exactly right roughly seven times in ten -- so presenting a single verdict
 * with no uncertainty would be overclaiming to the person most likely to act
 * on it.
 *
 * This is the one screen that is NOT a garden. A parent reading it at 10pm
 * wants a document, not a playground -- so it borrows the rail's dark header
 * and the grade colours and otherwise behaves like a report: the verdict on
 * the left at a readable measure, the evidence on the right, nothing hidden
 * behind a tap.
 */
import type { Pack, PackNode } from '../game/pack'
import { kidName } from '../game/pack'
import { recommendation, skillKind } from '../game/pedagogy'

export interface BriefData {
  wall: PackNode | undefined
  best: { nodeId: string; confidence: number } | null
  runnersUp: { nodeId: string; confidence: number }[]
  path: string[]
  asked: { nodeId: string; correct: boolean }[]
  questionCount: number
}

/** Same grade colours as the Grove and the trail, so the three screens agree. */
const GRADE_HUE: Record<number, string> = {
  5: '#f8836b', 4: '#ffc94a', 3: '#4fb083',
  2: '#3fbfa0', 1: '#5bb8e8', 0: '#a97ff0',
}
const gradeNum = (g?: string) => (g === 'K' ? 0 : Number(g) || 0)
const gradeLabel = (g: string) => (g === 'K' ? 'kindergarten' : `grade ${g}`)

/** A short, parent-legible name for what the wall problem was about. */
function topicOf(wall: PackNode): string {
  const c = wall.code
  if (c.includes('.NF')) return 'fractions'
  if (c.includes('.OA')) return 'times tables'
  if (c.includes('.NBT')) return 'big numbers'
  if (c.includes('.MD')) return 'measuring'
  if (c.includes('.G')) return 'shapes'
  return (wall.kid ?? wall.teacher).toLowerCase()
}

/**
 * The drop, drawn. A parent reading a report at 10pm will look at one picture
 * and read maybe two sentences, so the single most important fact -- how far
 * BELOW the homework the real problem sits -- gets to be the picture. It is
 * the same cross-section as the child's screen, which also quietly shows the
 * grown-up what she has been looking at.
 */
function DepthDiagram({
  wallGrade,
  gapGrade,
  wallName,
  gapName,
}: {
  wallGrade: number
  gapGrade: number
  wallName: string
  gapName: string
}) {
  const BANDS = [
    { g: 5, fill: '#ffe0a0' }, { g: 4, fill: '#f0c477' },
    { g: 3, fill: '#d9a758' }, { g: 2, fill: '#b8863c' },
    { g: 1, fill: '#8a5a28' }, { g: 0, fill: '#6b4520' },
  ]
  const H = 34
  const yOf = (g: number) => (5 - g) * H + H / 2
  const x = 132
  const wallY = yOf(wallGrade)
  const gapY = yOf(gapGrade)

  return (
    <svg className="pr-depth" viewBox={`0 0 320 ${BANDS.length * H}`} role="img"
         aria-label={`The homework is grade ${wallGrade}; the gap is ${
           gapGrade === 0 ? 'kindergarten' : `grade ${gapGrade}`}`}>
      {BANDS.map((b, i) => (
        <g key={b.g}>
          <rect x="0" y={i * H} width="320" height={H} fill={b.fill}
                opacity={b.g <= wallGrade && b.g >= gapGrade ? 1 : 0.4} />
          <text x="8" y={i * H + 21} fontSize="9.5" fontWeight="600"
                letterSpacing="1.2" fill={b.g >= 3 ? '#7a6330' : '#e8d7b8'}
                fontFamily="'IBM Plex Mono', ui-monospace, monospace">
            {b.g === 0 ? 'K' : `GR ${b.g}`}
          </text>
        </g>
      ))}

      {/* the root, from the homework down to what it was really standing on */}
      <path
        d={`M${x - 5} ${wallY} C${x - 5} ${(wallY + gapY) / 2}, ` +
           `${x - 9} ${(wallY + gapY) / 2}, ${x - 1} ${gapY} ` +
           `C${x + 9} ${(wallY + gapY) / 2}, ${x + 5} ${(wallY + gapY) / 2}, ` +
           `${x + 5} ${wallY} Z`}
        fill="#7a4a1c" opacity=".55"
      />

      <circle cx={x} cy={wallY} r="11" fill="#fdf6e8"
              stroke={GRADE_HUE[wallGrade]} strokeWidth="4" />
      <text x={x + 20} y={wallY + 4} fontSize="11.5" fill="#3b2a12">
        {wallName.length > 26 ? `${wallName.slice(0, 25)}…` : wallName}
      </text>
      <text x={x + 20} y={wallY + 15} fontSize="8.5" letterSpacing="1"
            fill="rgba(59,42,18,.6)"
            fontFamily="'IBM Plex Mono', ui-monospace, monospace">
        THE HOMEWORK
      </text>

      <circle cx={x} cy={gapY} r="13" fill={GRADE_HUE[gapGrade]}
              stroke="#16233a" strokeWidth="3" />
      <text x={x + 22} y={gapY + 3} fontSize="11.5" fontWeight="600"
            fill={gapGrade >= 3 ? '#3b2a12' : '#fdf6e8'}>
        {gapName.length > 24 ? `${gapName.slice(0, 23)}…` : gapName}
      </text>
      <text x={x + 22} y={gapY + 14} fontSize="8.5" letterSpacing="1"
            fill={gapGrade >= 3 ? 'rgba(59,42,18,.6)' : 'rgba(253,246,232,.7)'}
            fontFamily="'IBM Plex Mono', ui-monospace, monospace">
        THE GAP
      </text>
    </svg>
  )
}

/** Confidence as a dial. A flat bar reads as a score; a dial reads as a gauge. */
function ConfidenceRing({ pct, hue }: { pct: number; hue: string }) {
  const R = 26
  const C = 2 * Math.PI * R
  return (
    <svg className="pr-ring" viewBox="0 0 64 64" role="img"
         aria-label={`${pct} per cent confident`}>
      <circle cx="32" cy="32" r={R} fill="none" strokeWidth="7"
              stroke={`color-mix(in srgb, ${hue} 26%, transparent)`} />
      <circle
        cx="32" cy="32" r={R} fill="none" strokeWidth="7" stroke={hue}
        strokeLinecap="round" transform="rotate(-90 32 32)"
        strokeDasharray={`${(C * pct) / 100} ${C}`}
      />
      <text x="32" y="37" textAnchor="middle" fontSize="17" fontWeight="600"
            fill="currentColor">{pct}</text>
    </svg>
  )
}

export function Brief({
  pack,
  data,
  onBack,
}: {
  pack: Pack
  data: BriefData
  onBack: () => void
}) {
  const node = (id: string) => pack.nodes.find((n) => n.id === id)
  const gap = data.best ? node(data.best.nodeId) : undefined
  const kind = gap ? skillKind(gap.text) : 'unclear'
  const rec = recommendation(kind)

  // Name the topic from the wall she actually walked in with, rather than
  // assuming fractions -- a different wall makes the hardcoded version a lie.
  const topic = data.wall ? topicOf(data.wall) : 'this'
  const gapsBelow =
    gap && data.wall
      ? Math.max(0, gradeNum(data.wall.grade) - gradeNum(gap.grade))
      : 0

  const confidence = Math.round((data.best?.confidence ?? 0) * 100)
  // The engine records the path bottom-up -- it discovers the gap and walks
  // back to the wall -- but a parent reads a chain downwards, and the whole
  // product is about digging DOWN. Reversed here so the rendering agrees with
  // both the sentence above it and the Grove.
  const chain = data.path
    .map(node)
    .filter((n): n is PackNode => !!n)
    .reverse()

  return (
    <div className="pr">
      <header className="pr-top">
        <div>
          <div className="kicker" style={{ color: '#7f93b4', marginBottom: 4 }}>
            for a grown-up
          </div>
          <div className="pr-top-title">
            {data.wall ? `Session on ${topicOf(data.wall)}` : 'No session yet'}

          </div>
        </div>

        <div className="pr-top-facts">
          <div className="pr-fact">
            <b>{data.questionCount}</b><span>questions asked</span>
          </div>
          <div className="pr-fact">
            <b>{gapsBelow > 0 ? gapsBelow : '—'}</b>
            <span>grades below the homework</span>
          </div>
          <div className="pr-fact">
            <b>{data.best ? `${confidence}%` : '—'}</b><span>confidence</span>
          </div>
        </div>

        <button className="pr-back" onClick={onBack}>
          ← back to the game
        </button>
      </header>

      <div className="pr-body">
        {/* ---- the verdict, at a readable measure ---------------------- */}
        <main className="pr-main">
          {gap ? (
            <>
              <h1 className="pr-verdict">She isn&rsquo;t behind on {topic}.</h1>
              <p className="pr-lede">
                She is missing one {gradeLabel(gap.grade)} idea that {topic}{' '}
                rest{topic.endsWith('s') ? '' : 's'} on
                {gapsBelow > 0 &&
                  `, ${gapsBelow} grade${gapsBelow > 1 ? 's' : ''} below where the homework was`}
                .
              </p>

              {data.wall && (
                <DepthDiagram
                  wallGrade={gradeNum(data.wall.grade)}
                  gapGrade={gradeNum(gap.grade)}
                  wallName={kidName(data.wall)}
                  gapName={kidName(gap)}
                />
              )}

              <section
                className="pr-gap"
                style={{ ['--gc' as string]: GRADE_HUE[gradeNum(gap.grade)] }}
              >
                <div className="pr-gap-main">
                  <div className="pr-gap-tag">most likely gap</div>
                  <div className="pr-gap-name">{kidName(gap)}</div>
                  <div className="pr-gap-teacher">
                    {gap.teacher}
                    <span className="pr-code">{gap.code}</span>
                  </div>
                </div>
                <div className="pr-gap-ring">
                  <ConfidenceRing pct={confidence}
                                  hue={GRADE_HUE[gradeNum(gap.grade)]} />
                  <span>confident</span>
                </div>
              </section>

              {data.runnersUp.length > 0 && (
                <section className="pr-block">
                  <div className="kicker">also possible</div>
                  {data.runnersUp.map((r) => {
                    const n = node(r.nodeId)
                    if (!n) return null
                    return (
                      <div key={r.nodeId} className="pr-runner">
                        <span
                          className="pr-runner-pip"
                          style={{ background: GRADE_HUE[gradeNum(n.grade)] }}
                        />
                        <span>{kidName(n)}</span>
                        <span className="pr-runner-pct">
                          {Math.round(r.confidence * 100)}%
                        </span>
                      </div>
                    )
                  })}
                </section>
              )}

              <section className="pr-rec">
                <b>{rec.headline}.</b> {rec.detail}
              </section>

              {gap.reteach && (
                <section className="pr-block">
                  <div className="kicker">what to actually do</div>
                  <p className="pr-do">{gap.reteach}</p>
                </section>
              )}
            </>
          ) : data.questionCount === 0 ? (
            <>
              <h1 className="pr-verdict">Nothing to report yet.</h1>
              <p className="pr-lede">
                This page fills itself in while she plays. It is not a score
                and there is nothing here to revise for.
              </p>
              <ul className="pr-promise">
                <li>
                  <b>Which idea is actually broken</b> — named as a skill, with
                  its standard code, and how confident we are.
                </li>
                <li>
                  <b>How far below the homework it sits</b> — the chain from
                  what she was set down to what it rests on.
                </li>
                <li>
                  <b>Whether practice will fix it</b> — or whether this is the
                  kind of gap that needs a person for twenty minutes.
                </li>
                <li>
                  <b>Every question she was asked</b> — and how she answered.
                </li>
              </ul>
              <p className="pr-note">
                Start a session from the grove and come back here.
              </p>
            </>
          ) : (
            <>
              <h1 className="pr-verdict">Not enough to go on yet.</h1>
              <p className="pr-lede">
                {data.questionCount} questions were not enough to be confident
                about where the gap is, so nothing is being claimed. Another
                session will usually settle it. Guessing here would send her to
                fix something that may not be broken.
              </p>
            </>
          )}
        </main>

        {/* ---- the evidence ------------------------------------------- */}
        <aside className="pr-side">
          {chain.length > 0 && (
            <section className="pr-block">
              <div className="kicker">what rests on it</div>
              <p className="pr-note">
                Top is the homework. Each step down is what that one needs
                first.
              </p>
              <ol className="pr-chain">
                {chain.map((n, i) => (
                  <li
                    key={n.id}
                    className={`pr-link${gap && n.id === gap.id ? ' is-gap' : ''}`}
                    style={{ ['--gc' as string]: GRADE_HUE[gradeNum(n.grade)] }}
                  >
                    <span className="pr-link-dot">
                      {n.grade === 'K' ? 'K' : n.grade}
                    </span>
                    <span className="pr-link-name">
                      {kidName(n)}
                      {gap && n.id === gap.id ? (
                        <em>the gap</em>
                      ) : (
                        i === 0 && <em>the homework</em>
                      )}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <section className="pr-block">
            <div className="kicker">
              what she was asked ({data.questionCount})
            </div>
            <div className="pr-asked">
              {data.asked.map((a, i) => {
                const n = node(a.nodeId)
                if (!n) return null
                return (
                  <div key={`${a.nodeId}-${i}`} className="pr-ask">
                    <span
                      className={`pr-mark${a.correct ? ' ok' : ' no'}`}
                      aria-hidden="true"
                    >
                      {a.correct ? '✓' : '✗'}
                    </span>
                    <span className="pr-ask-name">{kidName(n)}</span>
                    <span className="pr-ask-grade">gr {n.grade}</span>
                  </div>
                )
              })}
              {data.asked.length === 0 && (
                <p className="pr-note">
                  Nothing asked yet — this fills in as she plays.
                </p>
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}
