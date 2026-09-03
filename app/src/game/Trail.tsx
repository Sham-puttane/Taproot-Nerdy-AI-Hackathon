/**
 * The descent, drawn as one continuous root going down.
 *
 * The first version put the stops in grade bands but drew nothing between
 * them, so the thing the product is actually about -- that these skills hang
 * off each other in a chain, and we are following that chain DOWNWARD -- was
 * the one thing missing. A list of pills in coloured stripes is not a root.
 *
 * So it is a single SVG now: the strata are background rects, the root is one
 * path, and every stop is a bead ON that path. Because the bands are sized
 * from the stops they contain, a bead can never drift off the root -- the two
 * are computed from the same numbers rather than aligned by eye.
 *
 * It carries four things, none of which needs a sentence of UI copy:
 *
 *   how far she has come    beads behind her, root drawn solid
 *   how deep she has gone   which stratum she is standing in
 *   how much is left        the dashed root and hollow beads below
 *   the reward              a bead lights and a fruit lands in the canopy
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

const GRADES = [5, 4, 3, 2, 1, 0]

const BAND: Record<number, { fill: string; ink: string }> = {
  5: { fill: '#ffe0a0', ink: '#8a7440' },
  4: { fill: '#f0c477', ink: '#7a6330' },
  3: { fill: '#d9a758', ink: '#5a4118' },
  2: { fill: '#b8863c', ink: '#f0dcbc' },
  1: { fill: '#8a5a28', ink: '#e8d7b8' },
  0: { fill: '#6b4520', ink: '#d9bd93' },
}

const HUE: Record<number, string> = {
  5: '#f8836b', 4: '#ffc94a', 3: '#4fb083',
  2: '#3fbfa0', 1: '#5bb8e8', 0: '#a97ff0',
}

const gradeNum = (g: string) => (g === 'K' ? 0 : Number(g) || 0)

const W = 420        // svg user units across
const ROW = 74       // vertical space one stop occupies
const SKY = 118      // canopy + grass above the first stratum
const CX = 74        // the root's resting x

/** Gentle sway, so the root looks grown rather than ruled. */
const rootX = (row: number) => CX + Math.sin(row * 0.9) * 16

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

  const layout = useMemo(() => {
    const raw = stops
      .map((s) => ({ ...s, node: byId.get(s.nodeId) }))
      .filter((r): r is typeof r & { node: NonNullable<typeof r.node> } => !!r.node)

    // Re-testing a skill is allowed on purpose -- one answer is weak evidence
    // against a 25% guess rate, and allowing it is worth half the engine's
    // accuracy. But the trail is a PATH, not a log: the same skill asked three
    // times is one place she stood, not three. Rendering it as three put three
    // labels at the same height on top of each other.
    const order: string[] = []
    const seen = new Map<string, { correct: boolean | null; asked: number }>()
    for (const r of raw) {
      const prev = seen.get(r.nodeId)
      if (!prev) { order.push(r.nodeId); seen.set(r.nodeId, { correct: r.correct, asked: 1 }) }
      // keep the LATEST verdict: what she knows now, not what she knew first
      else seen.set(r.nodeId, { correct: r.correct, asked: prev.asked + 1 })
    }
    const rows = order.map((id) => {
      const v = seen.get(id)!
      return { nodeId: id, correct: v.correct, asked: v.asked, node: byId.get(id)! }
    })

    // Bands are sized by what they hold, which is what keeps every bead
    // sitting exactly on the root: both come out of these same offsets.
    let y = SKY
    let row = 0
    const bands: {
      grade: number; top: number; height: number; reached: boolean
    }[] = []
    const beads: {
      id: string; name: string; grade: number; row: number; asked: number
      x: number; y: number; lit: boolean; now: boolean; missed: boolean
    }[] = []

    const deepest = rows.length
      ? Math.min(...rows.map((r) => gradeNum(r.node.grade)))
      : 5

    for (const g of GRADES) {
      const here = rows.filter((r) => gradeNum(r.node.grade) === g)
      const height = Math.max(1, here.length) * ROW
      bands.push({ grade: g, top: y, height, reached: g >= deepest })
      here.forEach((r, i) => {
        const yy = y + (i + 0.5) * ROW
        beads.push({
          id: r.node.id,
          name: kidName(r.node),
          grade: g,
          row,
          asked: r.asked,
          x: rootX(row),
          y: yy,
          lit: r.correct === true || lit.has(r.node.id),
          now: r.correct === null,
          missed: r.correct === false,
        })
        row += 1
      })
      y += height
    }

    return { bands, beads, height: y, deepest, count: rows.length }
  }, [stops, lit, byId])

  const { bands, beads, height, deepest, count } = layout

  // How much ground is still underneath her -- the dashed root leads into it.
  const below = GRADES.filter((g) => g < deepest).length
  const last = beads[beads.length - 1]
  const fruit = beads.filter((b) => b.lit).slice(-5)

  // One smooth path through every bead, continued dashed into the dark.
  const path = beads.length
    ? beads.reduce(
        (d, b, i) =>
          i === 0
            ? `M${b.x} ${SKY - 24} Q${b.x} ${(SKY - 24 + b.y) / 2} ${b.x} ${b.y}`
            : `${d} C${beads[i - 1].x} ${(beads[i - 1].y + b.y) / 2}, ${b.x} ${
                (beads[i - 1].y + b.y) / 2
              }, ${b.x} ${b.y}`,
        '',
      )
    : ''

  return (
    <div className="tr">
      <div className="tr-head">
        <div className="tr-kicker">digging down</div>
        <div className="tr-count">
          <b>{count}</b>
          <span>
            {count === 1 ? 'step down' : 'steps down'}
            {below > 0 && ` · ${below} layer${below === 1 ? '' : 's'} below`}
          </span>
        </div>
      </div>

      <svg
        className="tr-svg"
        viewBox={`0 0 ${W} ${height + 30}`}
        preserveAspectRatio="xMidYMin meet"
        role="img"
        aria-label={`${count} steps down, currently in ${
          last ? `grade ${last.grade}` : 'grade 5'
        }`}
      >
        {/* sky, canopy, grass */}
        <rect x="0" y="0" width={W} height={SKY} fill="#1e3350" />
        <g>
          <rect x={CX - 7} y={SKY - 62} width="14" height="52" rx="5" fill="#c98a3a" />
          <circle cx={CX} cy={SKY - 82} r="34" fill="#46c9a4" />
          <circle cx={CX - 26} cy={SKY - 66} r="21" fill="#3bb694" />
          <circle cx={CX + 26} cy={SKY - 66} r="21" fill="#57d3ae" />
          {/* every lit bead puts a fruit in the canopy -- the reward is not a
              number, it is that the tree above her visibly gains something */}
          {fruit.map((b, i) => (
            <circle
              key={`${b.id}-${b.row}`}
              className="tr-fruit"
              cx={CX - 22 + (i % 3) * 22 + (i > 2 ? 11 : 0)}
              cy={SKY - 96 + Math.floor(i / 3) * 22}
              r="7"
              fill={HUE[b.grade]}
              stroke="#1e3350"
              strokeWidth="2"
            />
          ))}
        </g>
        <path
          d={`M0 ${SKY} Q${W / 2} ${SKY - 16} ${W} ${SKY}`}
          fill="#3fa06b"
          stroke="none"
        />

        {/* the ground she is cutting through */}
        {bands.map((b) => (
          <g key={b.grade} opacity={b.reached ? 1 : 0.42}>
            <rect
              x="0" y={b.top} width={W} height={b.height}
              fill={BAND[b.grade].fill}
            />
            <line
              x1="0" y1={b.top} x2={W} y2={b.top}
              stroke="rgba(0,0,0,.10)" strokeWidth="2"
            />
            <text
              x="12" y={b.top + 18}
              fill={BAND[b.grade].ink}
              fontSize="11"
              fontFamily="'IBM Plex Mono', ui-monospace, monospace"
              letterSpacing="1.4"
              fontWeight="600"
            >
              {b.grade === 0 ? 'KINDER' : `GRADE ${b.grade}`}
            </text>
          </g>
        ))}

        {/* the root: solid where she has been, dashed into what is left */}
        {last && below > 0 && (
          <path
            d={`M${last.x} ${last.y} C${last.x} ${last.y + 60}, ${
              rootX(last.row + 2)
            } ${last.y + 90}, ${rootX(last.row + 2)} ${height - 6}`}
            fill="none" stroke="#5a4118" strokeWidth="6"
            strokeLinecap="round" strokeDasharray="8 12" opacity=".55"
          />
        )}
        {path && (
          <>
            <path d={path} fill="none" stroke="#7a4a1c" strokeWidth="11"
                  strokeLinecap="round" opacity=".45" />
            <path className="tr-root" d={path} fill="none" stroke="#ffc94a"
                  strokeWidth="6" strokeLinecap="round" />
          </>
        )}

        {/* the beads */}
        {beads.map((b) => (
          <g key={`${b.id}-${b.row}`} className={`tr-bead${b.now ? ' now' : ''}${b.lit ? ' lit' : ''}`}>
            <circle
              cx={b.x} cy={b.y} r={b.now ? 20 : 17}
              fill={b.lit ? HUE[b.grade] : b.missed ? '#fdf6e8' : '#e9dcc4'}
              stroke={b.now ? '#16233a' : 'rgba(22,35,58,.55)'}
              strokeWidth={b.now ? 4 : 2.5}
            />
            <text
              x={b.x} y={b.y + 5} textAnchor="middle"
              fontSize="15" fontWeight="600" fill="#16233a"
            >
              {b.grade === 0 ? 'K' : b.grade}
            </text>
            <text
              x={b.x + 30} y={b.y + (b.now ? -1 : 4)}
              fontSize="13.5" fill="#16233a" fontWeight={b.now ? 600 : 400}
            >
              {b.name.length > 38 ? `${b.name.slice(0, 37)}…` : b.name}
            </text>
            {b.asked > 1 && (
              <text
                x={b.x + 30} y={b.y + (b.now ? 26 : 17)} fontSize="10"
                fill="rgba(22,35,58,.55)"
                fontFamily="'IBM Plex Mono', ui-monospace, monospace"
                letterSpacing="0.8"
              >
                CHECKED {b.asked}×
              </text>
            )}
            {b.now && (
              <text x={b.x + 30} y={b.y + 14} fontSize="10.5"
                    fill="rgba(22,35,58,.62)"
                    fontFamily="'IBM Plex Mono', ui-monospace, monospace"
                    letterSpacing="1">
                YOU ARE HERE
              </text>
            )}
          </g>
        ))}

        {/* a hollow bead in the dark, so "there is more underneath" is shown
            rather than asserted */}
        {below > 0 && last && (
          <circle
            cx={rootX(last.row + 2)} cy={height - 6} r="15"
            fill="none" stroke="rgba(22,35,58,.45)" strokeWidth="3"
            strokeDasharray="5 5"
          />
        )}
      </svg>

      {reason && <p className="tr-why">{reason}</p>}
    </div>
  )
}
