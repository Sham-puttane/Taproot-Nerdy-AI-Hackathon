/**
 * The grown-up's view of everything, not just today.
 *
 * The report already explained one session well. What it could not answer is
 * the question a parent or tutor actually arrives with: *where is she, across
 * the whole subject, and is it getting better?* One session cannot say that.
 * Saved progress can, and it was sitting unused three feet away.
 *
 * Three pictures, each answering a question nobody could answer before:
 *
 *   Strength by topic   what is she good at, and what is she not
 *   Depth by grade      WHERE the gaps cluster -- the single most useful
 *                       thing a tutor can know before planning a session
 *   Repairs over time   is this working
 *
 * Everything is drawn from real mastery beliefs and real keystones. A chart
 * that flattered would be worse than no chart, because this is the screen
 * someone acts on.
 */
import type { Pack } from '../game/pack'
import type { Progress } from '../game/progress'
import { families, health } from '../grove/families'

const HUE: Record<number, string> = {
  5: '#f8836b', 4: '#ffc94a', 3: '#4fb083',
  2: '#3fbfa0', 1: '#5bb8e8', 0: '#a97ff0',
}
const FAMILY_HUE: Record<string, string> = {
  fractions: '#f8836b', times: '#ffc94a', bignumbers: '#5bb8e8',
  measuring: '#4fb083', shapes: '#a97ff0', counting: '#3fbfa0',
}
const gnum = (g: string) => (g === 'K' ? 0 : Number(g) || 0)

export function Overview({
  pack,
  progress,
  threshold = 0.75,
}: {
  pack: Pack
  progress: Progress
  threshold?: number
}) {
  const fams = families(pack, progress)
  const anyLit = fams.some((f) => f.lit > 0)

  // Lit vs total per grade -- the gap map.
  const byGrade = [5, 4, 3, 2, 1, 0].map((g) => {
    const nodes = pack.nodes.filter((n) => gnum(n.grade) === g)
    const lit = nodes.filter(
      (n) => (progress.mastery[n.id] ?? 0) >= threshold).length
    return { g, lit, total: nodes.length }
  })

  const keystones = [...progress.keystones].sort(
    (a, b) => a.earnedAt - b.earnedAt)

  if (!anyLit && !keystones.length) {
    return (
      <section className="ov ov-empty">
        <div className="kicker">the bigger picture</div>
        <p className="pr-note">
          Once she has played a session or two, this fills in with where she is
          strong, which grades her gaps cluster in, and whether the repairs are
          holding.
        </p>
      </section>
    )
  }

  return (
    <section className="ov">
      <div className="kicker">the bigger picture</div>

      {/* ---- 1. what she is good at ---------------------------------- */}
      <h3 className="ov-h">Strength by topic</h3>
      <p className="pr-note">
        Share of each topic&rsquo;s foundation she has shown she holds. These
        overlap on purpose &mdash; a fraction rests on shapes, so repairing one
        idea can lift several.
      </p>
      <div className="ov-bars">
        {fams.map((f) => {
          const pct = Math.round(health(f) * 100)
          return (
            <div key={f.id} className="ov-bar-row">
              <span className="ov-bar-name">{f.label}</span>
              <div className="ov-bar">
                <i style={{
                  width: `${Math.max(pct, f.lit ? 2 : 0)}%`,
                  background: FAMILY_HUE[f.id] ?? '#4fb083',
                }} />
              </div>
              <span className="ov-bar-num">
                {f.lit}<span className="ov-of">/{f.total}</span>
              </span>
            </div>
          )
        })}
      </div>

      {/* ---- 2. where the gaps are ----------------------------------- */}
      <h3 className="ov-h">Where the gaps sit</h3>
      <p className="pr-note">
        The grade a gap lives in matters more than how many there are. A thin
        column low down is worth more attention than a thin one at the top.
      </p>
      <div className="ov-grades">
        {byGrade.map(({ g, lit, total }) => {
          const pct = total ? (lit / total) * 100 : 0
          return (
            <div key={g} className="ov-grade">
              <div className="ov-col">
                <div className="ov-col-fill"
                     style={{ height: `${Math.max(pct, lit ? 3 : 0)}%`,
                              background: HUE[g] }} />
              </div>
              <span className="ov-col-num">{lit}<span className="ov-of">/{total}</span></span>
              <span className="ov-col-label">{g === 0 ? 'K' : g}</span>
            </div>
          )
        })}
      </div>

      {/* ---- 3. is it working ---------------------------------------- */}
      {keystones.length > 0 && (
        <>
          <h3 className="ov-h">
            Repairs so far <span className="ov-count">{keystones.length}</span>
          </h3>
          <p className="pr-note">
            Each one is a broken idea found and fixed, with how far below the
            homework it turned out to be.
          </p>
          <ol className="ov-keys">
            {keystones.slice(-8).reverse().map((k, i) => (
              <li key={`${k.nodeId}-${i}`} className="ov-key">
                <span className="ov-key-dot"
                      style={{ background: HUE[gnum(k.grade)] }}>
                  {k.grade === 'K' ? 'K' : k.grade}
                </span>
                <span className="ov-key-body">
                  <b>{k.name}</b>
                  <em>
                    found under {k.wall}
                    {k.depth > 0 && ` · ${k.depth} grade${
                      k.depth === 1 ? '' : 's'} below`}
                  </em>
                </span>
                <span className="ov-key-when">
                  {new Date(k.earnedAt).toLocaleDateString(undefined,
                    { month: 'short', day: 'numeric' })}
                </span>
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  )
}
