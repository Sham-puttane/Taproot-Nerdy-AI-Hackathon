/**
 * The moment the session becomes permanent.
 *
 * The Return proves she can do the problem that beat her. This proves it
 * counted for something -- one keystone, kept, named after the idea she
 * actually fixed rather than after how many questions she answered.
 *
 * A keystone is the stone that holds an arch up: take it out and everything
 * above it falls. It is the only reward in the product, and it is only ever
 * given for repairing a real gap.
 */
import type { Keystone } from '../game/progress'
import { gradeVar } from '../game/grade'

export function Earned({
  keystone,
  litBefore,
  litAfter,
  onHome,
}: {
  keystone: Keystone | null
  litBefore: number
  litAfter: number
  onHome: () => void
}) {
  const gained = Math.max(0, litAfter - litBefore)

  return (
    <div className="frame">
      <div className="kicker">kept</div>

      {keystone ? (
        <>
          <h1 className="say">Keystone found.</h1>
          <div className="earned">
            <div
              className="badge-big"
              aria-hidden="true"
              style={{ background: gradeVar(keystone.grade) }}
            >
              {keystone.grade === 'K' ? 'K' : `G${keystone.grade}`}
            </div>
            <div style={{ fontSize: 20, marginBottom: 4 }}>{keystone.name}</div>
            <div style={{ fontSize: 14, color: 'var(--ink-dim)' }}>
              {keystone.depth > 0
                ? `${keystone.depth} grade${keystone.depth > 1 ? 's' : ''} below where you got stuck`
                : 'right under where you got stuck'}
            </div>
          </div>

          <div className="coach">
            {gained > 0 ? (
              <>
                <b>
                  {gained} more root{gained > 1 ? 's' : ''} lit.
                </b>{' '}
                Everything above this one just got easier &mdash; and it stays
                lit tomorrow.
              </>
            ) : (
              <>
                <b>It stays lit tomorrow.</b> Next time you come back, this one
                is already yours.
              </>
            )}
          </div>
        </>
      ) : (
        <>
          <h1 className="say">Good digging.</h1>
          <p className="lede">
            We did not find one clear gap this time, so no keystone &mdash; but
            everything you got right is remembered, and the next dig starts from
            there.
          </p>
        </>
      )}

      <div className="spacer" />
      <button className="go" onClick={onHome}>
        See my grove
      </button>
    </div>
  )
}
