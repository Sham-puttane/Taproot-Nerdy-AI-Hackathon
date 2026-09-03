/**
 * The Grove at full width: one cross-section of ground.
 *
 * Six trees above, the same ground cut open below, so every tree's roots are
 * visibly reaching down through the grade strata. That relationship IS the
 * product's thesis, and it is the one thing a phone-width column cannot show:
 * at 390px you get the trees or the strata, never how they connect.
 *
 * Everything here is driven by real progress. A tree's canopy grows with how
 * much of its family is lit, fruit appears once an idea is solid, flowers when
 * it is starting, and a dashed seed marks a family she has not touched. A tree
 * that looked healthy while she had lit nothing would be the home screen
 * lying to her.
 */
import type { Pack } from '../game/pack'
import type { Progress } from '../game/progress'
import { families, health, type Family } from './families'

const GRADE_BANDS = [
  { grade: 5, fill: '#ffe0a0', ink: '#8a7440' },
  { grade: 4, fill: '#f0c477', ink: '#7a6330' },
  { grade: 3, fill: '#d9a758', ink: '#5a4118' },
  { grade: 2, fill: '#b8863c', ink: '#f0dcbc' },
  { grade: 1, fill: '#8a5a28', ink: '#e8d7b8' },
  { grade: 0, fill: '#6b4520', ink: '#d9bd93' },
]

const ROOT_COLOR = ['#a97ff0', '#5bb8e8', '#3fbfa0', '#4fb083', '#ffc94a', '#f8836b']

export function GroveWide({
  pack,
  progress,
  onStart,
}: {
  pack: Pack
  progress: Progress
  onStart: () => void
}) {
  const fams = families(pack, progress)
  const litTotal = fams.reduce((a, f) => a + f.lit, 0)
  const planted = fams.filter((f) => f.lit > 0).length

  return (
    <div className="grove-wide">
      <div className="gw-sky">
        <svg viewBox="0 0 1440 330" preserveAspectRatio="none" className="gw-sky-art" aria-hidden="true">
          <circle cx="1290" cy="64" r="34" fill="#ffc94a" />
          <g fill="#ffffff" opacity=".85">
            <ellipse cx="200" cy="72" rx="52" ry="22" />
            <ellipse cx="244" cy="62" rx="34" ry="20" />
            <ellipse cx="880" cy="54" rx="44" ry="19" />
          </g>
        </svg>

        <header className="gw-head">
          <div className="kicker" style={{ color: '#1d3a52', opacity: 0.7 }}>your grove</div>
          <h1 className="gw-title">
            {litTotal === 0
              ? 'Nothing planted yet.'
              : `${planted} ${planted === 1 ? 'tree' : 'trees'}. ${litTotal} roots lit.`}
          </h1>
          <p className="gw-sub">
            {litTotal === 0
              ? 'Bring a problem that beat you. We find what it is really about, fix that, and the tree above it starts growing.'
              : 'Every root you light feeds the tree above it. Fruit means that idea is solid.'}
          </p>
        </header>

        <div className="gw-stats">
          <div className="gw-chip" style={{ background: '#ffc94a' }}>
            <b>{progress.keystones.length}</b><span>keystones</span>
          </div>
          <div className="gw-chip" style={{ background: '#ff7d6b' }}>
            <b>{progress.deepest}</b><span>grades deep</span>
          </div>
        </div>
      </div>

      {/* trees + labels sit on the grass line */}
      <div className="gw-trees">
        {fams.map((f, i) => (
          <Tree key={f.id} family={f} hue={ROOT_COLOR[i % ROOT_COLOR.length]} />
        ))}
      </div>

      {/* the ground, cut open */}
      <div className="gw-under">
        {GRADE_BANDS.map((b) => (
          <div key={b.grade} className="gw-band" style={{ background: b.fill }}>
            <span className="gw-band-label" style={{ color: b.ink }}>
              {b.grade === 0 ? 'KINDER' : `GRADE ${b.grade}`}
            </span>
          </div>
        ))}

        <svg viewBox="0 0 1440 520" preserveAspectRatio="none" className="gw-roots" aria-hidden="true">
          {fams.map((f, i) => (
            <Roots
              key={f.id}
              index={i}
              count={fams.length}
              family={f}
              hue={ROOT_COLOR[i % ROOT_COLOR.length]}
            />
          ))}
        </svg>
      </div>

      <button className="gw-cta" onClick={onStart}>
        {litTotal === 0 ? 'Start digging' : 'Dig again'}
      </button>
    </div>
  )
}

function Tree({ family, hue }: { family: Family; hue: string }) {
  // canopy tinted toward the family's root colour, so a tree and the roots
  // beneath it read as the same plant
  const leaf = `color-mix(in srgb, ${hue} 26%, #46c9a4)`
  const h = health(family)
  const r = 14 + h * 30
  const fruit = Math.min(4, family.keystones)
  const flowering = h > 0 && family.keystones === 0

  return (
    <div className="gw-tree">
      <svg viewBox="0 0 160 150" className="gw-tree-art" role="img"
           aria-label={`${family.label}: ${family.lit} of ${family.total} skills lit`}>
        {family.lit === 0 && family.keystones === 0 ? (
          /* An unplanted family used to be a bare dashed circle, so a new
             player's Grove had no trees on it at all and read as broken rather
             than as an invitation. Now it shows the GHOST of the tree that will
             grow here -- outlined, not filled -- with the seed at its foot. */
          <g>
            {/* The ghost sits where a canopy would, which is up in the pale
                sky -- so it needs a stroke dark enough to read against blue,
                not the mint that works on the dark ground. */}
            <g opacity="0.5">
              <circle cx="80" cy="70" r="27" fill="#2f7d5d" fillOpacity="0.14"
                      stroke="#1f6b4d" strokeWidth="2.5" strokeDasharray="7 6" />
              <circle cx="60" cy="83" r="18" fill="#2f7d5d" fillOpacity="0.14"
                      stroke="#1f6b4d" strokeWidth="2.5" strokeDasharray="7 6" />
              <circle cx="100" cy="83" r="18" fill="#2f7d5d" fillOpacity="0.14"
                      stroke="#1f6b4d" strokeWidth="2.5" strokeDasharray="7 6" />
              <path d="M80 98v20" stroke="#1f6b4d" strokeWidth="3"
                    strokeLinecap="round" strokeDasharray="7 6" />
            </g>
            <g>
              <circle cx="80" cy="124" r="8" fill="#ffc94a" />
              <path d="M80 124c0-8 6-13 12-14-1 8-6 13-12 14z" fill="#46c9a4" />
            </g>
          </g>
        ) : (
          <>
            <rect x={80 - r * 0.16} y={120 - r * 0.8} width={r * 0.32}
                  height={r * 0.9 + 8} rx={r * 0.14} fill="#8a5a28" />
            <circle cx="80" cy={112 - r} r={r} fill={leaf} />
            <circle cx={80 - r * 0.72} cy={118 - r * 0.72} r={r * 0.62} fill="#3bb694" />
            <circle cx={80 + r * 0.72} cy={118 - r * 0.72} r={r * 0.62} fill="#57d3ae" />
            {Array.from({ length: fruit }).map((_, k) => (
              <circle key={k}
                      cx={80 + Math.cos(k * 2.1) * r * 0.62}
                      cy={112 - r + Math.sin(k * 2.1) * r * 0.55}
                      r={Math.max(4, r * 0.16)}
                      fill={k % 2 ? '#ffc94a' : '#ff7d6b'} />
            ))}
            {flowering && (
              <circle cx={80 - r * 0.4} cy={106 - r} r="4.5" fill="#f7a8d8" />
            )}
          </>
        )}
      </svg>
      <div className="gw-tree-name">{family.label}</div>
      <div className="gw-tree-note">
        {family.lit === 0 ? 'a seed' : `${family.lit} of ${family.total} lit`}
      </div>
    </div>
  )
}

/** One tree's roots, reaching as deep as she has actually dug. */
function Roots({
  index, count, family, hue,
}: { index: number; count: number; family: Family; hue: string }) {
  const x = ((index + 0.5) / count) * 1440
  // deepestGrade -1 means nothing lit; grade 5 is the top band, K the bottom
  const bandH = 520 / GRADE_BANDS.length
  const reached = family.deepestGrade < 0
    ? 0
    : (5 - family.deepestGrade + 1) * bandH
  const full = 520

  return (
    <g>
      <path
        d={`M${x} 0 C${x} ${full * 0.3}, ${x - 26} ${full * 0.5}, ${x - 14} ${full}`}
        stroke="#5a4118" strokeWidth="6" fill="none" strokeLinecap="round"
        opacity="0.4" strokeDasharray="9 11"
      />
      {reached > 0 && (
        <>
          <path
            d={`M${x} 0 C${x} ${reached * 0.34}, ${x - 22} ${reached * 0.6}, ${x - 10} ${reached}`}
            stroke={hue} strokeWidth="9" fill="none" strokeLinecap="round"
          />
          <path
            d={`M${x} ${reached * 0.22} C${x + 30} ${reached * 0.4}, ${x + 40} ${reached * 0.6}, ${x + 34} ${reached * 0.8}`}
            stroke={hue} strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.8"
          />
          {family.keystones > 0 && (
            <g transform={`translate(${x - 30} ${reached - 22}) rotate(-8)`}>
              <rect width="40" height="40" rx="13" fill={hue}
                    stroke="#16233a" strokeWidth="3" />
              <text x="20" y="27" textAnchor="middle" fontSize="17"
                    fontWeight="600" fill="#16233a">
                {family.deepestGrade === 0 ? 'K' : family.deepestGrade}
              </text>
            </g>
          )}
        </>
      )}
    </g>
  )
}
