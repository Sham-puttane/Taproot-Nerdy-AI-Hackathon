/**
 * The Grove: what she has actually earned.
 *
 * This is the screen that turns a diagnostic into a game. Everything else is
 * one session long; this is the only place where yesterday counts.
 *
 * It is deliberately not a scoreboard. There are no points, no timer, no
 * streak to break by missing a Tuesday. The reward is the tree itself and the
 * keystones under it -- one for each gap she actually found and repaired --
 * which is a record of understanding rather than of attendance. And because a
 * root only lights when the mastery belief clears its threshold, and the
 * belief barely moves on easy correct answers, there is nothing here that can
 * be farmed.
 */
import { useMemo } from 'react'
import type { Progress } from '../game/progress'
import { litCount } from '../game/progress'
import { gradeVar } from '../game/grade'

export function Grove({
  progress,
  totalSkills,
  onStart,
}: {
  progress: Progress
  totalSkills: number
  onStart: () => void
}) {
  const lit = litCount(progress)
  const first = progress.sessions === 0
  const keystones = [...progress.keystones].sort((a, b) => b.earnedAt - a.earnedAt)

  return (
    <div className="frame">
      <div className="kicker">your grove</div>
      <h1 className="say">
        {first ? 'Nothing planted yet.' : `${lit} roots lit.`}
      </h1>
      <p className="lede">
        {first
          ? 'Bring a problem that beat you. We will find what it is really about, fix that, and this tree starts growing.'
          : keystones.length === 1
            ? 'One keystone found. Every root you light makes the ones above it easier.'
            : `${keystones.length} keystones found. Every root you light makes the ones above it easier.`}
      </p>

      <Tree lit={lit} total={totalSkills} keystones={keystones.length} />

      {!first && (
        <div className="stats">
          <Stat n={lit} label="roots lit" />
          <Stat n={keystones.length} label="keystones" />
          <Stat
            n={progress.deepest}
            label={progress.deepest === 1 ? 'grade deep' : 'grades deep'}
          />
        </div>
      )}

      {keystones.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div className="kicker">keystones</div>
          <div className="keystones">
            {keystones.map((k) => (
              <div className="keystone" key={k.nodeId}>
                <div
                  className="keystone-grade"
                  style={{ ['--gc' as string]: gradeVar(k.grade) }}
                >
                  {k.grade === 'K' ? 'K' : `G${k.grade}`}
                </div>
                <div>
                  <div className="keystone-name">{k.name}</div>
                  <div className="keystone-note">
                    found under {k.wall}
                    {k.depth > 0 &&
                      ` · ${k.depth} grade${k.depth > 1 ? 's' : ''} down`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="spacer" />
      <button className="go" onClick={onStart}>
        {first ? 'Start digging' : 'Dig again'}
      </button>
    </div>
  )
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="stat">
      <b>{n}</b>
      <span>{label}</span>
    </div>
  )
}

/**
 * A tree whose roots light as she masters them.
 *
 * Deterministic from the counts -- the same progress always draws the same
 * tree, because one that reshuffled between visits would not feel like hers.
 */
function Tree({
  lit,
  total,
  keystones,
}: {
  lit: number
  total: number
  keystones: number
}) {
  const frac = total > 0 ? Math.min(1, lit / total) : 0

  const roots = useMemo(() => {
    // fixed pseudo-random layout, seeded so it never moves
    let s = 7
    const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
    return Array.from({ length: 14 }, (_, i) => {
      const side = i % 2 === 0 ? -1 : 1
      const depth = 0.18 + (i / 14) * 0.72
      return {
        x1: 50,
        y1: 42 + depth * 12,
        x2: 50 + side * (8 + rnd() * 30) * depth,
        y2: 48 + depth * 46,
        order: rnd(),
      }
    }).sort((a, b) => a.order - b.order)
  }, [])

  const litRoots = Math.round(frac * roots.length)
  const canopy = 6 + Math.round(frac * 10)

  return (
    <svg viewBox="0 0 100 100" className="tree" role="img"
         aria-label={`A tree with ${lit} of ${total} roots lit and ${keystones} keystones`}>
      {/* soil */}
      <rect x="0" y="46" width="100" height="54" fill="var(--ground-2)" rx="3" />

      {/* canopy: grows with how much is lit */}
      <circle cx="50" cy={30 - frac * 4} r={canopy} fill="var(--leaf)"
              opacity={0.25 + frac * 0.75} />
      <circle cx={50 - canopy * 0.7} cy={34 - frac * 2} r={canopy * 0.66}
              fill="var(--leaf)" opacity={0.2 + frac * 0.6} />
      <circle cx={50 + canopy * 0.7} cy={34 - frac * 2} r={canopy * 0.66}
              fill="var(--leaf)" opacity={0.2 + frac * 0.6} />

      {/* trunk */}
      <rect x="47.6" y={34 - frac * 2} width="4.8" height="18" rx="2"
            fill="var(--glow-soft)" />

      {/* roots */}
      {roots.map((r, i) => (
        <line
          key={i}
          x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2}
          stroke={
            i < litRoots
              ? `var(--g-${['K', '1', '2', '3', '4', '5'][i % 6]})`
              : 'var(--root-dead)'
          }
          strokeWidth={i < litRoots ? 1.9 : 1.2}
          strokeLinecap="round"
          opacity={i < litRoots ? 1 : 0.55}
        />
      ))}
      <line x1="50" y1="46" x2="50" y2="94" strokeLinecap="round"
            stroke="var(--glow)" strokeWidth="2.6"
            opacity={0.35 + frac * 0.65} />
    </svg>
  )
}
