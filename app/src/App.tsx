import { useEffect, useState } from 'react'
import {
  loadPack, kidName, isHandsOn,
  type Pack, type Item, type PackNode,
} from './game/pack'
import { useGame } from './game/useGame'
import { Trail } from './game/Trail'
import { Brief } from './parent/Brief'
import { GroveWide } from './grove/GroveWide'
import { PickWide } from './game/PickWide'
import { Earned } from './grove/Earned'
import { VoiceAnswer } from './game/VoiceAnswer'
import { Reward } from './game/Reward'
import { Cascade } from './game/Cascade'
import { Bedrock } from './game/Bedrock'
import { fold, type Keystone, type Progress } from './game/progress'
import {
  addLearner, loadFor, loadRoster, removeLearner, saveFor, setActive,
  type Learner,
} from './game/learners'
import { Who } from './game/Who'
import { speak } from './game/tts'
import { useSpeaker } from './game/useSpeaker'
import { useOffline } from './game/useOffline'
import { Cut } from './items/Cut'
import { Place } from './items/Place'
import { NumberLine } from './items/NumberLine'
import { Groups } from './items/Groups'
import { Balance } from './items/Balance'
import './theme.css'

export default function App() {
  const [pack, setPack] = useState<Pack | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [skin, setSkin] = useState<'meadow' | 'soil'>('meadow')
  // Dev affordance: ?preview=cut shows one instrument on its own, so a
  // manipulative can be worked on without playing through to reach it.
  const preview = new URLSearchParams(location.search).get('preview')
  const offline = useOffline()
  const voice = useSpeaker()

  const [progress, setProgress] = useState<Progress | null>(null)

  const [learners, setLearners] = useState<Learner[] | null>(null)

  const [activeId, setActiveId] = useState<string | null>(null)

  const [switching, setSwitching] = useState(false)
  const [wall, setWall] = useState<string | null>(null)
  const [showGrownup, setShowGrownup] = useState(false)
  const [picking, setPicking] = useState(false)

  useEffect(() => {
    loadPack().then(setPack).catch((e) => setErr(String(e)))
    void loadRoster().then(async (r) => {
      setLearners(r.learners)
      if (r.activeId) {
        setActiveId(r.activeId)
        setProgress(await loadFor(r.activeId))
      }
    })
  }, [])

  async function pickLearner(id: string) {

    await setActive(id)

    setActiveId(id)

    setProgress(await loadFor(id))

    setLearners((await loadRoster()).learners)

    setWall(null)

    setPicking(false)

    setSwitching(false)

  }


  async function makeLearner(name: string) {

    const l = await addLearner(name)

    await pickLearner(l.id)

  }


  async function dropLearner(id: string) {

    await removeLearner(id)

    const r = await loadRoster()

    setLearners(r.learners)

    if (r.activeId) await pickLearner(r.activeId)

    else { setActiveId(null); setProgress(null) }

  }


  useEffect(() => {

    document.documentElement.setAttribute('data-skin', skin)
  }, [skin])

  return (
    /* Every real screen now paints its own full-bleed background -- the Grove,
       the picker, the board and the parent report. Only the dev preview and
       the loading/error line still want the padded column. */
    <div className={`stage${pack && progress && !preview ? ' bleed' : ''}`}>
      <button
        className={`voice-toggle${voice.on ? ' on' : ''}`}
        onClick={voice.toggle}
        aria-pressed={voice.on}
        title={voice.on ? 'Reading aloud. Tap to mute.'
          : 'Muted. Tap to have questions read aloud.'}
      >
        {voice.on ? '🔊' : '🔇'}
      </button>
      <button
        className="skin-toggle"
        onClick={() => setSkin(skin === 'meadow' ? 'soil' : 'meadow')}
      >
        {skin === 'meadow' ? 'soil' : 'meadow'}
      </button>
      {pack && learners && learners.length > 0 && activeId && !switching && (
        <button
          className="switch-learner"
          onClick={() => setSwitching(true)}
          title="Someone else's turn"
        >
          {learners.find((l) => l.id === activeId)?.name ?? 'switch'}
        </button>
      )}
      {pack && progress && (
        <button
          className="grownup"
          onClick={() => setShowGrownup(true)}
          title="A report for a parent or tutor"
        >
          For grown-ups
        </button>
      )}
      {/* Which build this is. Reading it beats guessing: a stale service
          worker or a cached pack looks exactly like a missing feature. */}
      <span className="build-stamp" title="build time">{__BUILD__}</span>
      {offline && (
        <div className="offline" role="status">
          No internet &mdash; everything still works
        </div>
      )}
      {err && <p className="lede">Could not load: {err}</p>}
      {!pack && !err && <p className="lede">Loading…</p>}
      {/* Nobody chosen yet, or the grown-up asked to switch. One device,
          several children is Nerdy's actual business -- a tutor with four
          students in an afternoon, or siblings sharing a tablet -- and
          every one of them used to write into the same grove. */}
      {pack && !preview && learners && (!activeId || switching) && (
        <Who
          learners={learners}
          onPick={(id) => void pickLearner(id)}
          onAdd={(name) => void makeLearner(name)}
          onRemove={(id) => void dropLearner(id)}
          onClose={activeId ? () => setSwitching(false) : undefined}
        />
      )}

      {pack && preview && <Preview pack={pack} kind={preview} />}
      {pack && !preview && activeId && !switching && progress && showGrownup && !wall && (
        <Brief
          pack={pack}
          progress={progress ?? undefined}
          data={{
            wall: undefined, best: null, runnersUp: [], path: [],
            asked: [], questionCount: 0,
          }}
          onBack={() => setShowGrownup(false)}
        />
      )}
      {pack && !preview && activeId && !switching && progress && !showGrownup && !picking && !wall && (
        <GroveWide
          pack={pack}
          progress={progress}
          onStart={() => setPicking(true)}
        />
      )}
      {pack && !preview && activeId && !switching && progress && picking && (
        <PickWide
          pack={pack}
          onPick={(code) => {
            setWall(code)
            setPicking(false)
          }}
          onBack={() => setPicking(false)}
        />
      )}
      {pack && !preview && activeId && !switching && progress && wall && (
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
            if (activeId) void saveFor(activeId, next)
          }}
          voice={voice}
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
  if (!item) {
    // "No X items in this pack" was a dead end that told a tester nothing --
    // not whether they had typed the kind wrong, not whether their pack was
    // stale, not what they could look at instead. All three were true at
    // various points today.
    const have = [...new Set(pack.items.map((i) => i.kind))].sort()
    return (
      <div className="frame">
        <div className="kicker">preview</div>
        <h1 className="say">No {kind} items here.</h1>
        <p className="lede">
          This pack holds {pack.items.length} items across {have.length} kinds.
          If {kind} is one of them, the pack in this browser is out of date --
          reload once.
        </p>
        <div className="opts">
          {have.map((k) => (
            <a key={k} className="opt" href={`?preview=${k}`}>{k}</a>
          ))}
        </div>
      </div>
    )
  }
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

/**
 * The topic in the child's words, for "It was never about ___".
 *
 * Derived from the wall's standard rather than from what she tapped in the
 * picker, because the descent can and does cross families -- and the sentence
 * has to be about the problem that actually beat her.
 */
function topicWord(wall: PackNode | undefined): string {
  if (!wall) return 'that'
  const c = wall.code
  if (c.includes('.NF')) return 'fractions'
  if (c.includes('.OA')) return 'times tables'
  if (c.includes('.NBT')) return 'big numbers'
  if (c.includes('.MD')) return 'measuring'
  if (c.includes('.G.')) return 'shapes'
  return 'that'
}

function Game({
  pack,
  wallCode,
  progress,
  grownupOpen,
  onGrownupClose,
  onFinish,
  voice,
  onHome,
  }: {
  pack: Pack
  wallCode: string
  progress: Progress
  grownupOpen: boolean
  onGrownupClose: () => void
  onFinish: (beliefs: Record<string, number>, k: Keystone | null) => void
  voice: ReturnType<typeof useSpeaker>
  onHome: () => void
}) {
  const g = useGame(pack, wallCode)
  const [chosen, setChosen] = useState<number | null>(null)
  // The verdict is held separately from `chosen` because `chosen` is cleared
  // the moment the next item arrives, and the reward has to outlive that.
  const [verdict, setVerdict] = useState<{
    correct: boolean; grade: number; nth: number
  } | null>(null)
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


  // Read each new question aloud. The reading load went UP when 624

  // bare sums became word problems, and the children furthest behind

  // in maths are usually behind in reading too -- so without this the

  // content improvement would be a step backwards for exactly the

  // child this is built for.

  useEffect(() => {

    if (!g.item) return

    const t = window.setTimeout(() => voice.say(g.item!.stem), 260)

    return () => window.clearTimeout(t)

    // eslint-disable-next-line react-hooks/exhaustive-deps

  }, [g.item, voice.on])

  const bedrockNode = g.bedrock ? g.nodeOf(g.bedrock.nodeId) : undefined
  // The moment the whole descent exists for, said out loud.

  useEffect(() => {

    if (g.phase !== 'bedrock' || !bedrockNode) return

    voice.say(

      `It was never really about that. The tricky bit is ` +

      `${kidName(bedrockNode)}.`, 0.9)

    // eslint-disable-next-line react-hooks/exhaustive-deps

  }, [g.phase, bedrockNode, voice.on])

  function choose(i: number) {
    if (chosen !== null) return
    setChosen(i)

    // Hands-on instruments signal through this channel too: they pass their
    // own answer_index for right and -1 for wrong, so the same test holds.
    const right = g.item ? i === g.item.answer_index : false
    const here = g.item ? g.nodeOf(g.item.node_id) : undefined
    setVerdict((v) => ({
      correct: right,
      grade: here ? (here.grade === 'K' ? 0 : Number(here.grade) || 0) : 5,
      nth: (v?.nth ?? 0) + 1,
    }))

    voice.say(right ? 'Yes. That is the one.' : 'Not that one.', 1)


    // Long enough to see what happened, short enough not to feel punished.
    // A correct answer gets longer, because there is now something to watch.
    const pause = g.phase === 'descent' ? (right ? 760 : 460) : 900
    window.setTimeout(() => g.answer(i), pause)
  }

  if (showBrief) {
    return (
      <Brief
        pack={pack}
        progress={progress ?? undefined}
        data={{ ...g.brief(), wall: g.wallNode }}
        onBack={() => {
          setShowBrief(false)
          onGrownupClose()
        }}
      />
    )
  }

  const inSession = [
    'wall', 'descent', 'bedrock', 'repair', 'cascade', 'climb', 'return',
  ].includes(g.phase)

  return (
    <div className="board">
      {inSession && (
        <aside className="rail">
          <Trail pack={pack} stops={g.trail} lit={g.lit} reason={g.why} />
        </aside>
      )}
      <div className="play">
      {/* Inside the play column, not the board: centred on the viewport it
          landed on the answer buttons rather than over the question. */}
      <Reward
        correct={verdict ? verdict.correct : null}
        grade={verdict?.grade ?? 5}
        nth={verdict?.nth ?? 0}
      />
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
          {/* This screen had no way off it. A child who answers the very first
              question correctly -- the good outcome -- was stranded, with the
              only escape a browser refresh. */}
          <div className="spacer" />
          <button className="go" onClick={onHome}>Pick something else</button>
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
        <Bedrock
          wall={g.wallNode}
          gap={bedrockNode}
          // The posterior's confidence in the gap's IDENTITY, which is what
          // "we are 70% sure" means. bedrock.belief is something else --
          // how broken the skill looks -- and showing it here would be a
          // different number wearing the same words.
          confidence={g.brief().best?.confidence ?? 0}
          questions={g.itemsUsed}
          topic={topicWord(g.wallNode)}
          onFix={g.beginRepair}
          onGrownup={() => setShowBrief(true)}
        />
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

      {g.phase === 'cascade' && g.bedrock && (
        <Cascade
          pack={pack}
          fixed={g.bedrock.nodeId}
          woke={g.woke}
          wokeTotal={g.wokeTotal}
          onLight={g.lightUp}
          onDone={g.beginClimb}
        />
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
      {handsOn && item.kind === 'numberline' && item.value
        && item.ticks != null && (
        <NumberLine
          key={item.stem}
          value={item.value}
          ticks={item.ticks}
          min={item.min ?? 0}
          max={item.max ?? 1}
          onDone={(ok) => onChoose(ok ? 0 : 1)}
        />
      )}
      {handsOn && item.kind === 'groups'
        && item.rows != null && item.cols != null && (
        <Groups
          key={item.stem}
          rows={item.rows}
          cols={item.cols}
          onDone={(ok) => onChoose(ok ? 0 : 1)}
        />
      )}
      {handsOn && item.kind === 'balance'
        && item.a != null && item.b != null && item.given != null && (
        <Balance
          key={item.stem}
          a={item.a}
          b={item.b}
          given={item.given}
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
