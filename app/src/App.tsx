import { useEffect, useState } from 'react'
import { loadPack, kidName, isHandsOn, type Pack, type Item } from './game/pack'
import { useGame } from './game/useGame'
import { Trail } from './game/Trail'
import { Brief } from './parent/Brief'
import { GroveWide } from './grove/GroveWide'
import { PickWide } from './game/PickWide'
import { Earned } from './grove/Earned'
import { VoiceAnswer } from './game/VoiceAnswer'
import {
  fold, loadProgress, saveProgress,
  type Keystone, type Progress,
} from './game/progress'
import { speak } from './game/tts'
import { useOffline } from './game/useOffline'
import { Cut } from './items/Cut'
import { Place } from './items/Place'
import './theme.css'

export default function App() {
  const [pack, setPack] = useState<Pack | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [skin, setSkin] = useState<'meadow' | 'soil'>('meadow')
  // Dev affordance: ?preview=cut shows one instrument on its own, so a
  // manipulative can be worked on without playing through to reach it.
  const preview = new URLSearchParams(location.search).get('preview')
  const offline = useOffline()

  const [progress, setProgress] = useState<Progress | null>(null)
  const [wall, setWall] = useState<string | null>(null)
  const [showGrownup, setShowGrownup] = useState(false)
  const [picking, setPicking] = useState(false)

  useEffect(() => {
    loadPack().then(setPack).catch((e) => setErr(String(e)))
    loadProgress().then(setProgress)
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-skin', skin)
  }, [skin])

  return (
    /* Every real screen now paints its own full-bleed background -- the Grove,
       the picker, the board and the parent report. Only the dev preview and
       the loading/error line still want the padded column. */
    <div className={`stage${pack && progress && !preview ? ' bleed' : ''}`}>
      <button
        className="skin-toggle"
        onClick={() => setSkin(skin === 'meadow' ? 'soil' : 'meadow')}
      >
        {skin === 'meadow' ? 'soil' : 'meadow'}
      </button>
      {pack && progress && (
        <button
          className="grownup"
          onClick={() => setShowGrownup(true)}
          title="A report for a parent or tutor"
        >
          For grown-ups
        </button>
      )}
      {offline && (
        <div className="offline" role="status">
          No internet &mdash; everything still works
        </div>
      )}
      {err && <p className="lede">Could not load: {err}</p>}
      {!pack && !err && <p className="lede">Loading…</p>}
      {pack && preview && <Preview pack={pack} kind={preview} />}
      {pack && !preview && progress && showGrownup && !wall && (
        <Brief
          pack={pack}
          data={{
            wall: undefined, best: null, runnersUp: [], path: [],
            asked: [], questionCount: 0,
          }}
          onBack={() => setShowGrownup(false)}
        />
      )}
      {pack && !preview && progress && !showGrownup && !picking && !wall && (
        <GroveWide
          pack={pack}
          progress={progress}
          onStart={() => setPicking(true)}
        />
      )}
      {pack && !preview && progress && picking && (
        <PickWide
          pack={pack}
          onPick={(code) => {
            setWall(code)
            setPicking(false)
          }}
          onBack={() => setPicking(false)}
        />
      )}
      {pack && !preview && progress && wall && (
        <Game
          key={wall}
          pack={pack}
          wallCode={wall}
          progress={progress}
          grownupOpen={showGrownup}
          onGrownupClose={() => setShowGrownup(false)}
          onFinish={(beliefs, keystone) => {
            const next = fold(progress, beliefs, keystone)
            setProgress(next)
            void saveProgress(next)
          }}
          onHome={() => setWall(null)}
        />
      )}
    </div>
  )
}

function Preview({ pack, kind }: { pack: Pack; kind: string }) {
  const items = pack.items.filter((i) => i.kind === kind)
  const [n, setN] = useState(0)
  const item = items[n % Math.max(items.length, 1)]
  if (!item) return <p className="lede">No {kind} items in this pack.</p>
  return (
    <div className="frame">
      <div className="kicker">preview &middot; {kind} &middot; {items.length} items</div>
      <h1 className="say">{item.stem}</h1>
      <Question item={item} chosen={null} onChoose={() => setN(n + 1)} />
      <button className="go quiet" onClick={() => setN(n + 1)}>
        Next item
      </button>
    </div>
  )
}

function Game({
  pack,
  wallCode,
  progress,
  grownupOpen,
  onGrownupClose,
  onFinish,
  onHome,
}: {
  pack: Pack
  wallCode: string
  progress: Progress
  grownupOpen: boolean
  onGrownupClose: () => void
  onFinish: (beliefs: Record<string, number>, k: Keystone | null) => void
  onHome: () => void
}) {
  const g = useGame(pack, wallCode)
  const [chosen, setChosen] = useState<number | null>(null)
  const [showBrief, setShowBrief] = useState(false)
  // The App-level button and the in-session one open the same report.
  useEffect(() => {
    if (grownupOpen) setShowBrief(true)
  }, [grownupOpen])
  const [saved, setSaved] = useState(false)
  const [lastKeystone, setLastKeystone] = useState<Keystone | null>(null)
  const [litBefore] = useState(
    () => Object.values(progress.mastery).filter((v) => v >= 0.75).length,
  )

  // Fold the session into saved progress exactly once, when it ends.
  useEffect(() => {
    if (g.phase !== 'done' || saved) return
    setSaved(true)
    const bed = g.bedrock ? g.nodeOf(g.bedrock.nodeId) : undefined
    const wall = g.wallNode
    const gradeNum = (x?: string) => (x === 'K' ? 0 : Number(x) || 0)
    const keystone: Keystone | null = bed
      ? {
          nodeId: bed.id,
          code: bed.code,
          name: kidName(bed),
          grade: bed.grade,
          wall: wall ? kidName(wall) : 'a problem',
          depth: Math.max(0, gradeNum(wall?.grade) - gradeNum(bed.grade)),
          earnedAt: Date.now(),
        }
      : null
    setLastKeystone(keystone)
    onFinish(g.beliefs, keystone)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g.phase])

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

  if (showBrief) {
    return (
      <Brief
        pack={pack}
        data={{ ...g.brief(), wall: g.wallNode }}
        onBack={() => {
          setShowBrief(false)
          onGrownupClose()
        }}
      />
    )
  }

  const inSession = ['wall', 'descent', 'bedrock', 'repair', 'climb', 'return']
    .includes(g.phase)

  return (
    <div className="board">
      {inSession && (
        <aside className="rail">
          <Trail pack={pack} stops={g.trail} lit={g.lit} reason={g.why} />
        </aside>
      )}
      <div className="play">
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
          <button className="go quiet" onClick={() => setShowBrief(true)}>
            For a grown-up
          </button>
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
        <Earned
          keystone={lastKeystone}
          litBefore={litBefore}
          litAfter={Object.values(g.beliefs).filter((v) => v >= 0.75).length}
          onHome={onHome}
        />
      )}
      </div>
      </div>
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
  // Hands-on items decide their own correctness, so they signal through the
  // answer_index channel: -1 for wrong, answer_index for right.
  const handsOn = isHandsOn(item)
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

      {handsOn && item.kind === 'cut' && item.target != null && (
        <Cut
          key={item.stem}
          target={item.target}
          tolerance={item.tolerance}
          onDone={(ok) => onChoose(ok ? 0 : 1)}
        />
      )}
      {handsOn && item.kind === 'place' && item.value && item.ticks != null && (
        <Place
          key={item.stem}
          value={item.value}
          ticks={item.ticks}
          onDone={(ok) => onChoose(ok ? 0 : 1)}
        />
      )}

      {!handsOn && (
      <>
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
      <VoiceAnswer
        options={item.options}
        onPick={onChoose}
        disabled={chosen !== null}
      />
      </>
      )}
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
