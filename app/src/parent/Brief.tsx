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
  const grade = (g: string) => (g === 'K' ? 0 : Number(g) || 0)
  const gapsBelow =
    gap && data.wall ? Math.max(0, grade(data.wall.grade) - grade(gap.grade)) : 0

  return (
    <div className="frame">
      <div className="kicker">for a grown-up</div>

      {gap ? (
        <>
          <h1 className="say">
            She isn&rsquo;t behind on {topic}.
          </h1>
          <p className="lede">
            She is missing one{' '}
            {gap.grade === 'K' ? 'kindergarten' : `grade ${gap.grade}`} idea
            that {topic} rest{topic.endsWith('s') ? '' : 's'} on
            {gapsBelow > 0 && `, ${gapsBelow} grade${gapsBelow > 1 ? 's' : ''} below where the homework was`}.
          </p>

          <div className="card">
            <div className="kicker" style={{ marginBottom: 6 }}>
              most likely gap &middot; {Math.round((data.best?.confidence ?? 0) * 100)}% confident
            </div>
            <div style={{ fontSize: 19, marginBottom: 4 }}>{kidName(gap)}</div>
            <div style={{ fontSize: 13.5, color: 'var(--ink-dim)' }}>
              {gap.teacher}
              <span
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 11,
                  marginLeft: 8,
                  color: 'var(--ink-faint)',
                }}
              >
                {gap.code}
              </span>
            </div>
          </div>

          {data.runnersUp.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div className="kicker">also possible</div>
              {data.runnersUp.map((r) => {
                const n = node(r.nodeId)
                if (!n) return null
                return (
                  <div
                    key={r.nodeId}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 14,
                      color: 'var(--ink-dim)',
                      padding: '4px 0',
                    }}
                  >
                    <span>{kidName(n)}</span>
                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {Math.round(r.confidence * 100)}%
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          <div className="coach">
            <b>{rec.headline}.</b> {rec.detail}
          </div>

          {gap.reteach && (
            <div style={{ marginTop: 16 }}>
              <div className="kicker">what to actually do</div>
              <p style={{ fontSize: 14.5, margin: 0, lineHeight: 1.55 }}>
                {gap.reteach}
              </p>
            </div>
          )}

          <div style={{ marginTop: 18 }}>
            <div className="kicker">what rests on it</div>
            <div style={{ fontSize: 14, color: 'var(--ink-dim)' }}>
              {data.path.map((id, i) => {
                const n = node(id)
                return n ? (
                  <span key={id}>
                    {i > 0 && <span style={{ opacity: 0.5 }}> &rarr; </span>}
                    {kidName(n)}
                  </span>
                ) : null
              })}
            </div>
          </div>
        </>
      ) : (
        <>
          <h1 className="say">Not enough to go on yet.</h1>
          <p className="lede">
            {data.questionCount} questions were not enough to be confident about
            where the gap is, so nothing is being claimed. Another session will
            usually settle it. Guessing here would send her to fix something
            that may not be broken.
          </p>
        </>
      )}

      <div style={{ marginTop: 20 }}>
        <div className="kicker">what she was asked ({data.questionCount})</div>
        <div style={{ fontSize: 13.5, lineHeight: 1.7 }}>
          {data.asked.map((a, i) => {
            const n = node(a.nodeId)
            if (!n) return null
            return (
              <div key={`${a.nodeId}-${i}`} style={{ display: 'flex', gap: 8 }}>
                <span
                  aria-hidden="true"
                  style={{
                    color: a.correct ? 'var(--leaf)' : 'var(--wrong)',
                    width: 14,
                  }}
                >
                  {a.correct ? '✓' : '✗'}
                </span>
                <span style={{ color: 'var(--ink-dim)' }}>{kidName(n)}</span>
                <span
                  style={{
                    marginLeft: 'auto',
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 11,
                    color: 'var(--ink-faint)',
                  }}
                >
                  gr {n.grade}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <button className="go quiet" onClick={onBack}>
        Back to the game
      </button>
    </div>
  )
}
