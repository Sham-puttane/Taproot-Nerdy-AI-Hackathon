/**
 * The descent, drawn as the tree she is inside.
 *
 * Same ground as the Grove: canopy at the top, the same grade strata beneath,
 * the same colour per grade. Walking from the Grove into a session should feel
 * like zooming in on one tree, not like opening a different app -- which is
 * exactly what the old grey list of skill names felt like.
 *
 * It carries three things at once, none of which needs a sentence of UI copy:
 *
 *   how far she has come   the lit stops behind her
 *   how deep she has gone  which stratum she is standing in
 *   the reward             a stop lights and a fruit appears when she gets one
 *
 * And the WHY: after a miss, the reason for the next move is named underneath,
 * because the engine has always known why it descends and never said so.
 */
import { useMemo } from 'react'
import type { Pack } from './pack'
import { kidName } from './pack'

export interface TrailStop {
  nodeId: string
  correct: boolean | null // null = current, unanswered
}

const BANDS = [
  { grade: 5, fill: '#ffe0a0', ink: '#8a7440' },
  { grade: 4, fill: '#f0c477', ink: '#7a6330' },
  { grade: 3, fill: '#d9a758', ink: '#5a4118' },
  { grade: 2, fill: '#b8863c', ink: '#f0dcbc' },
  { grade: 1, fill: '#8a5a28', ink: '#e8d7b8' },
  { grade: 0, fill: '#6b4520', ink: '#d9bd93' },
]

const GRADE_HUE: Record<number, string> = {
  5: '#f8836b', 4: '#ffc94a', 3: '#4fb083',
  2: '#3fbfa0', 1: '#5bb8e8', 0: '#a97ff0',
}

const gradeNum = (g: string) => (g === 'K' ? 0 : Number(g) || 0)

export function Trail({
  pack,
  stops,
  lit,
  reason,
}: {
  pack: Pack
  stops: TrailStop[]
  lit: Set<string>
  reason?: string | null
}) {
  const byId = useMemo(() => new Map(pack.nodes.map((n) => [n.id, n])), [pack])

  const rows = stops
    .map((s) => ({ ...s, node: byId.get(s.nodeId) }))
    .filter((r): r is typeof r & { node: NonNullable<typeof r.node> } => !!r.node)

  const deepest = rows.length
    ? Math.min(...rows.map((r) => gradeNum(r.node.grade)))
    : 5

  return (
    <div className="tr">
      <div className="tr-head">
        <span className="tr-count">{rows.length}</span>
        <span>{rows.length === 1 ? 'step down' : 'steps down'}</span>
      </div>

      <div className="tr-ground">
        {/* canopy above the soil, so this reads as one tree from the Grove */}
        <svg viewBox="0 0 300 96" className="tr-canopy" aria-hidden="true">
          <circle cx="150" cy="52" r="34" fill="#46c9a4" />
          <circle cx="118" cy="66" r="22" fill="#3bb694" />
          <circle cx="182" cy="66" r="22" fill="#57d3ae" />
          {rows.filter((r) => r.correct === true || lit.has(r.node.id))
            .slice(0, 4)
            .map((r, i) => (
              <circle key={r.node.id + i}
                      cx={132 + i * 14} cy={40 + (i % 2) * 12} r="6"
                      fill={GRADE_HUE[gradeNum(r.node.grade)] ?? '#ffc94a'} />
            ))}
          <rect x="142" y="76" width="16" height="20" rx="6" fill="#c98a3a" />
        </svg>

        {BANDS.map((b) => {
          const here = rows.filter((r) => gradeNum(r.node.grade) === b.grade)
          const reached = b.grade >= deepest
          return (
            <div key={b.grade} className={`tr-band${reached ? '' : ' tr-unreached'}`}
                 style={{ background: b.fill }}>
              <span className="tr-band-label" style={{ color: b.ink }}>
                {b.grade === 0 ? 'KINDER' : `GRADE ${b.grade}`}
              </span>
              <div className="tr-stops">
                {here.map((r, i) => {
                  const isNow = r.correct === null
                  const isLit = r.correct === true || lit.has(r.node.id)
                  const hue = GRADE_HUE[b.grade] ?? '#ffc94a'
                  return (
                    <div
                      key={`${r.node.id}-${i}`}
                      className={`tr-stop${isNow ? ' now' : ''}${isLit ? ' lit' : ''}${
                        r.correct === false ? ' missed' : ''
                      }`}
                      style={{ ['--gc' as string]: hue }}
                    >
                      <span className="tr-dot">
                        {b.grade === 0 ? 'K' : b.grade}
                      </span>
                      <span className="tr-label">
                        {kidName(r.node)}
                        {isNow && <em>you are here</em>}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {reason && <p className="tr-why">{reason}</p>}
    </div>
  )
}
