/**
 * The descent as a trail you can see.
 *
 * The old panel was a grey list of skill names, which told a child nothing
 * about how far she had come or how much was left -- so the questions felt
 * endless. A trail answers both without a word: the tiles behind you are lit,
 * the tile you are on pulses, and there is visibly a bottom.
 *
 * It also carries the reward. There is still no score and no timer; getting one
 * right lights a tile and moves you, which is the whole feedback loop, and is
 * the reason "reward mastery" does not need a currency bolted on.
 *
 * And it carries the WHY. When she gets one wrong, the next tile opens BELOW
 * with a line drawn to it -- "this one rests on that one, so let's go and look"
 * -- which turns the prerequisite graph from a diagram into the reason she is
 * moving. That was the missing half of the product: it knew why it was
 * descending and never told her.
 */
import { useMemo } from 'react'
import type { Pack } from './pack'
import { kidName } from './pack'
import { gradeVar } from './grade'

export interface TrailStop {
  nodeId: string
  correct: boolean | null // null = current, unanswered
}

export function Trail({
  pack,
  stops,
  lit,
  reason,
}: {
  pack: Pack
  stops: TrailStop[]
  lit: Set<string>
  /** Shown under the newest tile after a wrong answer. */
  reason?: string | null
}) {
  const byId = useMemo(
    () => new Map(pack.nodes.map((n) => [n.id, n])),
    [pack],
  )

  const rows = stops
    .map((s) => ({ ...s, node: byId.get(s.nodeId) }))
    .filter((r) => r.node)

  if (!rows.length) return null

  return (
    <div className="trail" aria-label="Your path down">
      <div className="trail-head">
        <span className="trail-count">{rows.length}</span>
        <span>
          {rows.length === 1 ? 'step down' : 'steps down'}
        </span>
      </div>

      <ol className="trail-list">
        {rows.map((r, i) => {
          const n = r.node!
          const isNow = r.correct === null
          const isLit = lit.has(n.id) || r.correct === true
          const side = i % 2 === 0 ? 'l' : 'r'
          return (
            <li
              key={`${n.id}-${i}`}
              className={`stop ${side}${isNow ? ' now' : ''}${isLit ? ' lit' : ''}${
                r.correct === false ? ' missed' : ''
              }`}
              style={{ ['--gc' as string]: gradeVar(n.grade) }}
            >
              <span className="stop-dot" aria-hidden="true">
                {n.grade === 'K' ? 'K' : n.grade}
              </span>
              <span className="stop-label">
                {kidName(n)}
                {isNow && <em> &larr; you are here</em>}
              </span>
            </li>
          )
        })}
      </ol>

      {reason && <p className="trail-why">{reason}</p>}

      <div className="trail-foot" aria-hidden="true">
        <span className="trail-more">keep digging</span>
      </div>
    </div>
  )
}
