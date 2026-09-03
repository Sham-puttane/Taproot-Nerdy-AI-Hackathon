import { useEffect, useState } from 'react'
import { loadPack, kidName, type Pack, type Item } from './game/pack'
import { useGame } from './game/useGame'
import { Roots } from './Roots'
import { speak } from './game/tts'
import './theme.css'

export default function App() {
  const [pack, setPack] = useState<Pack | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [skin, setSkin] = useState<'meadow' | 'soil'>('meadow')

  useEffect(() => {
    loadPack().then(setPack).catch((e) => setErr(String(e)))
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-skin', skin)
  }, [skin])

  return (
    <div className="stage">
      <button
        className="skin-toggle"
        onClick={() => setSkin(skin === 'meadow' ? 'soil' : 'meadow')}
      >
        {skin === 'meadow' ? 'soil' : 'meadow'}
      </button>
      {err && <p className="lede">Could not load: {err}</p>}
      {!pack && !err && <p className="lede">Loading…</p>}
      {pack && <Game pack={pack} />}
    </div>
  )
}

function Game({ pack }: { pack: Pack }) {
  const g = useGame(pack)
  const [chosen, setChosen] = useState<number | null>(null)

  useEffect(() => {
    g.start()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => setChosen(null), [g.item, g.phase])

  const bedrockNode = g.bedrock ? g.nodeOf(g.bedrock.nodeId) : undefined

  function choose(i: number) {
    if (chosen !== null) return
    setChosen(i)
    // Long enough to see what happened, short enough not to feel punished.
    const pause = g.phase === 'descent' ? 420 : 900
    window.setTimeout(() => g.answer(i), pause)
  }

  return (
    <div className="frame">
      {g.phase === 'wall' && g.item && (
        <>
          <div className="kicker">let&rsquo;s see where you are</div>
          <h1 className="say">Give this one a go.</h1>
          <Question item={g.item} chosen={chosen} onChoose={choose} />
          <div className="spacer" />
          <span className="badge">no score &middot; no timer</span>
        </>
      )}

      {g.phase === 'nowall' && (
        <>
          <div className="kicker">nothing to fix</div>
          <h1 className="say">You already had that one.</h1>
          <p className="lede">
            Nothing underneath looks broken, so there is nothing to dig for.
            Come back with a problem that beat you.
          </p>
        </>
      )}

      {g.phase === 'descent' && g.item && (
        <>
          <div className="kicker">
            going deeper &middot; question {g.itemsUsed}
          </div>
          <h1 className="say">Okay. Let&rsquo;s find out why.</h1>
          <Question item={g.item} chosen={chosen} onChoose={choose} />
          <Roots
            pack={pack}
            path={g.asked}
            lit={g.lit}
            here={g.item.node_id}
            masteryOf={g.masteryOf}
          />
        </>
      )}

      {g.phase === 'bedrock' && (
        <>
          <div className="kicker">found it</div>
          <h1 className="say">Here&rsquo;s the tricky bit.</h1>
          {bedrockNode ? (
            <>
              <p className="lede">
                It was never really about{' '}
                {g.wallItem?.stem.replace(' = ?', '')}.
              </p>
              <div className="coach">
                <b>{kidName(bedrockNode)}</b>
                {bedrockNode.reteach ? ` — ${bedrockNode.reteach}` : ''}
              </div>
              <span className="badge" style={{ marginTop: 14 }}>
                {g.itemsUsed} questions &middot; grade {bedrockNode.grade}
              </span>
            </>
          ) : (
            <p className="lede">
              Nothing is clearly broken yet — let&rsquo;s keep practising.
            </p>
          )}
          <div className="spacer" />
          {bedrockNode && (
            <button className="go" onClick={g.beginRepair}>
              Fix it
            </button>
          )}
        </>
      )}

      {g.phase === 'repair' && g.item && bedrockNode && g.bedrock && (
        <>
          <div className="kicker">fixing &middot; {kidName(bedrockNode)}</div>
          <Question item={g.item} chosen={chosen} onChoose={choose} />
          <div className="spacer" />
          <div style={{ fontSize: 13, color: 'var(--ink-faint)' }}>
            how solid this feels
          </div>
          <div className="bar">
            <i
              style={{
                width: `${Math.round(g.masteryOf(g.bedrock.nodeId) * 100)}%`,
              }}
            />
          </div>
        </>
      )}

      {g.phase === 'climb' && (
        <>
          <div className="kicker">climbing back</div>
          <h1 className="say">Look what just woke up.</h1>
          {g.item ? (
            <Question item={g.item} chosen={chosen} onChoose={choose} />
          ) : (
            <p className="lede">Almost there…</p>
          )}
          <Roots
            pack={pack}
            path={g.climb}
            lit={g.lit}
            here={g.climb[g.climbAt]}
            masteryOf={g.masteryOf}
          />
        </>
      )}

      {g.phase === 'return' && g.item && (
        <>
          <div className="kicker">remember this one?</div>
          <h1 className="say">Twenty minutes ago this beat you.</h1>
          <Question item={g.item} chosen={chosen} onChoose={choose} />
        </>
      )}

      {g.phase === 'done' && (
        <>
          <div className="kicker">done</div>
          <h1 className="say">You fixed the root.</h1>
          <p className="lede">
            The gap was{' '}
            {bedrockNode ? kidName(bedrockNode).toLowerCase() : 'lower down'}
            {bedrockNode ? ` — grade ${bedrockNode.grade}` : ''}, well below
            where the homework was. Everything above it got easier.
          </p>
          <Roots
            pack={pack}
            path={g.climb}
            lit={g.lit}
            here={undefined}
            masteryOf={g.masteryOf}
          />
        </>
      )}
    </div>
  )
}

function Question({
  item,
  chosen,
  onChoose,
}: {
  item: Item
  chosen: number | null
  onChoose: (i: number) => void
}) {
  const wordy = item.stem.length > 28
  return (
    <>
      <div className="card"><div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
        }}
      >
        <div
          className={wordy ? 'lede' : 'prob'}
          style={wordy ? { marginTop: 12, textAlign: 'center' } : undefined}
        >
          {item.stem}
        </div>
        <button
          className="speak"
          aria-label="Read the question aloud"
          onClick={() => speak(item.stem)}
        >
          🔊
        </button>
      </div>

      {item.kind === 'partition' && item.parts != null && (
        <Shape
          parts={item.parts}
          shaded={item.shaded ?? 0}
          equal={item.equal_parts !== false}
        />
      )}
      </div>

      <div className={`opts${item.options.length === 2 ? ' single' : ''}`}>
        {item.options.map((o, i) => {
          const state =
            chosen === null
              ? ''
              : i === chosen
                ? i === item.answer_index
                  ? ' chosen-right'
                  : ' chosen-wrong'
                : i === item.answer_index
                  ? ' chosen-right'
                  : ''
          return (
            <button
              key={i}
              className={`opt${state}`}
              disabled={chosen !== null}
              onClick={() => onChoose(i)}
            >
              {o}
            </button>
          )
        })}
      </div>
    </>
  )
}

/**
 * A bar cut into `parts` pieces, `shaded` of them filled. Deliberately
 * lopsided when the item is probing whether the child checks that the pieces
 * are the same size -- which is the whole of 3.NF.A.1.
 */
function Shape({
  parts,
  shaded,
  equal,
}: {
  parts: number
  shaded: number
  equal: boolean
}) {
  const widths = equal
    ? Array.from({ length: parts }, () => 100 / parts)
    : unequalWidths(parts)
  let x = 0
  return (
    <svg
      viewBox="0 0 100 26"
      style={{ width: '100%', margin: '10px 0 4px' }}
      role="img"
      aria-label={`A bar split into ${parts} ${
        equal ? 'equal' : 'different sized'
      } pieces, ${shaded} shaded`}
    >
      {widths.map((w, i) => {
        const el = (
          <rect
            key={i}
            x={x}
            y={1}
            width={Math.max(w - 0.6, 0.4)}
            height={24}
            rx={2}
            fill={i < shaded ? 'var(--glow)' : 'var(--raised-2)'}
            stroke="var(--edge)"
            strokeWidth={0.5}
          />
        )
        x += w
        return el
      })}
    </svg>
  )
}

function unequalWidths(parts: number): number[] {
  // Deterministic: the same item must render identically every time. A shape
  // that reshuffles between renders would be a bug the child would notice.
  const base = Array.from({ length: parts }, (_, i) => 1 + ((i * 7) % 5) * 0.35)
  const total = base.reduce((a, b) => a + b, 0)
  return base.map((b) => (b / total) * 100)
}
