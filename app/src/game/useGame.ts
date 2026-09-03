/**
 * The loop: Wall -> Descent -> Bedrock -> Repair -> Climb -> Return.
 *
 * All of it runs on the local engine and the cached pack. No network, no
 * model call, nothing that can fail because a service is slow.
 */
import { useCallback, useMemo, useRef, useState } from 'react'
import { crossingNote } from './crossing'
import { Session } from '@engine/session'
import { DEFAULT_CONFIG } from '@engine/types'
import type { Bedrock } from '@engine/types'
import {
  isHandsOn,
  type Item,
  type Pack,
  type PackNode,
  itemKey,
  nodeByCode,
  pickItem,
  toGraph,
} from './pack'

export type Phase =
  | 'wall'
  | 'nowall'      // she solved it first time -- nothing to diagnose
  | 'descent'
  | 'bedrock'
  | 'repair'
  | 'cascade'    // the moment one repair wakes everything resting on it
  | 'climb'
  | 'return'
  | 'done'

export interface Attempt {
  item: Item
  chosen: number
  correct: boolean
}

/** Mastery is a belief, not a tally -- three lucky answers cannot clear it. */
const MASTERED = DEFAULT_CONFIG.masteryThreshold + DEFAULT_CONFIG.confidenceMargin

export function useGame(pack: Pack, wallCode?: string) {
  const graph = useMemo(() => toGraph(pack), [pack])
  const session = useRef<Session>(new Session(graph))
  const seen = useRef<Set<string>>(new Set())

  const [phase, setPhase] = useState<Phase>('wall')
  const [item, setItem] = useState<Item | null>(null)
  const [wallItem, setWallItem] = useState<Item | null>(null)
  const [firstAttempt, setFirstAttempt] = useState<Attempt | null>(null)
  const [bedrock, setBedrock] = useState<Bedrock | null>(null)
  const [climb, setClimb] = useState<string[]>([])
  // Everything in the corridor that RESTS on the repaired skill. This is the
  // product's whole argument in one list: fixing one kindergarten idea is not
  // one repair, it is every skill above it that was quietly built on sand.
  const [woke, setWoke] = useState<string[]>([])
  const [wokeTotal, setWokeTotal] = useState(0)
  const [climbAt, setClimbAt] = useState(0)
  const [lit, setLit] = useState<Set<string>>(new Set())
  const [asked, setAsked] = useState<string[]>([])
  const [trail, setTrail] = useState<{ nodeId: string; correct: boolean | null }[]>([])
  const [why, setWhy] = useState<string | null>(null)
  const [pendingClimbItem, setPendingClimbItem] = useState<Item | null>(null)
  const [tick, setTick] = useState(0)   // forces re-render on belief change

  // The chosen wall, falling back to the pack's own if none was picked.
  const wallNode = useMemo(
    () => nodeByCode(pack, wallCode ?? pack.wall) ?? nodeByCode(pack, pack.wall),
    [pack, wallCode],
  )

  const take = useCallback(
    (nodeId: string, prefer: 'quick' | 'handsOn' = 'quick'): Item | null => {
      const next = pickItem(pack, nodeId, seen.current, prefer)
      if (next) seen.current.add(itemKey(next))
      return next
    },
    [pack],
  )

  /** Begin: serve the wall problem she walked in with. */
  const start = useCallback(() => {
    if (!wallNode) return
    const first = take(wallNode.id)
    setWallItem(first)
    setItem(first)
    setTrail([{ nodeId: wallNode.id, correct: null }])
    setPhase('wall')
  }, [wallNode, take])

  const beliefs = () => session.current.beliefs

  const advanceDescent = useCallback(() => {
    const pick = session.current.next()
    if (!pick) {
      const b = session.current.bedrock()
      setBedrock(b)
      setPhase('bedrock')
      return
    }
    const next = take(pick.nodeId)
    if (!next) {
      // No instrument for this node yet. Skip rather than stall: mark it
      // asked so the selector moves on instead of offering it forever.
      session.current.answer(pick.nodeId, true)
      setTick((t) => t + 1)
      advanceDescent()
      return
    }
    // Explain the move using where we are ACTUALLY going, not a guess at a
    // prerequisite. The graph has always known why it descends; this is the
    // first time it says so, which is what turns "more questions" into "we are
    // following something".
    setTrail((t) => {
      const prev = t[t.length - 1]
      if (prev && prev.correct === false) {
        const from = pack.nodes.find((n) => n.id === prev.nodeId)
        const to = pack.nodes.find((n) => n.id === pick.nodeId)
        const isBelow = (pack.edges as [string, string][]).some(
          ([f, tt]) => f === pick.nodeId && tt === prev.nodeId,
        )
        if (from && to) {
          const name = (x: typeof to) => (x.kid ?? x.teacher)
          // When the descent leaves the topic she picked, say why. A child who
          // chose "big numbers" and lands in fractions is watching the app do
          // the most interesting thing it knows -- and used to be told nothing.
          const crossing = crossingNote(from.code, to.code)
          setWhy(
            crossing
              ? `${crossing}`
              : isBelow
                ? `${name(from)} is built on ${name(to).toLowerCase()} — so let's check that.`
                : `Let's try ${name(to).toLowerCase()} instead.`,
          )
        }
      } else {
        setWhy(null)
      }
      return [...t, { nodeId: pick.nodeId, correct: null }]
    })
    setItem(next)
    setAsked((a) => [...a, pick.nodeId])
  }, [take])

  /** One answer, routed by whichever beat we are in. */
  const answer = useCallback(
    (chosen: number) => {
      if (!item) return
      // A hands-on item has no option list and no answer_index; the
      // manipulative decides for itself and signals 0 for right, 1 for wrong.
      const correct = isHandsOn(item)
        ? chosen === 0
        : chosen === item.answer_index

      if (phase === 'wall') {
        setFirstAttempt({ item, chosen, correct })
        if (correct) {
          setPhase('nowall')
          return
        }
        setTrail((t) =>
          t.map((s2, i) => (i === t.length - 1 ? { ...s2, correct: false } : s2)),
        )
        session.current.seedFromWall(item.node_id)
        setPhase('descent')
        setTick((t) => t + 1)
        advanceDescent()
        return
      }

      if (phase === 'descent') {
        session.current.answer(item.node_id, correct)
        setTrail((t) =>
          t.map((s2, i) => (i === t.length - 1 ? { ...s2, correct } : s2)),
        )
        setTick((t) => t + 1)
        advanceDescent()
        return
      }

      if (phase === 'repair' && bedrock) {
        session.current.answer(bedrock.nodeId, correct)
        setTick((t) => t + 1)
        if (beliefs()[bedrock.nodeId] >= MASTERED) {
          const path = session.current.climbPath(
            bedrock.nodeId,
            wallNode?.id ?? '',
          )
          setClimb(path)
          setClimbAt(0)
          setLit(new Set([bedrock.nodeId]))

          // Walk UP the prerequisite edges from the repaired skill and collect
          // everything that stands on it, nearest first. Ordered by grade so
          // the cascade travels the way the ground does.
          const dependents = new Map<string, string[]>()
          for (const [from, to] of pack.edges as [string, string][]) {
            const list = dependents.get(from)
            if (list) list.push(to)
            else dependents.set(from, [to])
          }
          const reached = new Set<string>([bedrock.nodeId])
          const queue = [bedrock.nodeId]
          while (queue.length) {
            const cur = queue.shift()!
            for (const up of dependents.get(cur) ?? []) {
              if (!reached.has(up)) { reached.add(up); queue.push(up) }
            }
          }
          reached.delete(bedrock.nodeId)
          const gnum = (g: string) => (g === 'K' ? 0 : Number(g) || 0)

          // Everything in the whole K-5 map that stands on this skill. True,
          // and worth saying -- but most of it is not on HER path, so it is
          // reported as a number rather than animated as a promise.
          const totalReach = [...reached].filter((id) =>
            pack.nodes.some((n) => n.id === id))

          // Her corridor: what lies between the repaired skill and the
          // homework that beat her. These are the rungs she was actually
          // blocked on, so these are the ones that light up.
          const prereqsOf = new Map<string, string[]>()
          for (const [from, to] of pack.edges as [string, string][]) {
            const list = prereqsOf.get(to)
            if (list) list.push(from)
            else prereqsOf.set(to, [from])
          }
          const wallId = wallNode?.id ?? ''
          const underWall = new Set<string>([wallId])
          const dq = [wallId]
          while (dq.length) {
            const cur = dq.shift()!
            for (const down of prereqsOf.get(cur) ?? []) {
              if (!underWall.has(down)) { underWall.add(down); dq.push(down) }
            }
          }
          const onHerPath = totalReach.filter((id) => underWall.has(id))

          setWokeTotal(totalReach.length)
          setWoke(
            (onHerPath.length ? onHerPath : totalReach)
              .sort((a, b) => {
                const na = pack.nodes.find((n) => n.id === a)!
                const nb = pack.nodes.find((n) => n.id === b)!
                return gnum(na.grade) - gnum(nb.grade)
              }),
          )
          setPhase('cascade')
          const nextNode = path[1]
          // The climb used to happen entirely off the trail: the nodes she was
          // reclaiming were not stops, so the one moment the product moves UP
          // was invisible. Put the repaired bedrock and the next rung on the
          // trail so the ladder is climbed where she can see it.
          setTrail((t) => {
            const withBedrock = t.some((x) => x.nodeId === bedrock.nodeId)
              ? t.map((x) =>
                  x.nodeId === bedrock.nodeId ? { ...x, correct: true } : x)
              : [...t, { nodeId: bedrock.nodeId, correct: true }]
            return nextNode
              ? [...withBedrock, { nodeId: nextNode, correct: null }]
              : withBedrock
          })
          setPendingClimbItem(nextNode ? take(nextNode) : null)
          return
        }
        const again = take(bedrock.nodeId, 'handsOn')
        setItem(again)
        return
      }

      if (phase === 'climb') {
        const nodeId = climb[climbAt + 1]
        if (nodeId) {
          session.current.answer(nodeId, correct)
          setLit((s) => new Set([...s, nodeId]))
          setTick((t) => t + 1)
          // A rung she FAILED on the way down and has just answered on the way
          // up is the payoff of the whole session, so it has to land on the
          // same bead she watched go dark.
          setTrail((t) =>
            t.some((x) => x.nodeId === nodeId)
              ? t.map((x) => (x.nodeId === nodeId ? { ...x, correct } : x))
              : [...t, { nodeId, correct }],
          )
        }
        const at = climbAt + 1
        setClimbAt(at)
        const upcoming = climb[at + 1]
        if (upcoming) {
          setTrail((t) =>
            t.some((x) => x.nodeId === upcoming)
              ? t.map((x) =>
                  x.nodeId === upcoming ? { ...x, correct: null } : x)
              : [...t, { nodeId: upcoming, correct: null }],
          )
          setItem(take(upcoming))
        } else {
          setItem(wallItem)
          setPhase('return')
        }
        return
      }

      if (phase === 'return') {
        setPhase('done')
        return
      }
    },
    [item, phase, bedrock, climb, climbAt, wallItem, wallNode, advanceDescent, take],
  )

  /** The cascade lights rungs one at a time; the trail follows along. */
  const lightUp = useCallback((nodeId: string) => {
    setLit((s2) => new Set([...s2, nodeId]))
  }, [])

  /** She has watched the cascade; now walk back up through it. */
  const beginClimb = useCallback(() => {
    setPhase('climb')
    setItem(pendingClimbItem)
  }, [pendingClimbItem])

  const beginRepair = useCallback(() => {
    if (!bedrock) return
    setPhase('repair')
    setItem(take(bedrock.nodeId, 'handsOn'))
  }, [bedrock, take])

  const nodeOf = useCallback(
    (id: string): PackNode | undefined => pack.nodes.find((n) => n.id === id),
    [pack],
  )

  const brief = useCallback(() => {
    const d = session.current.diagnosis()
    return {
      wallNode,
      best: d?.best ? { nodeId: d.best.nodeId, confidence: d.best.confidence } : null,
      runnersUp: (d?.top ?? [])
        .slice(1)
        .filter((t) => t.confidence > 0.02)
        .map((t) => ({ nodeId: t.nodeId, confidence: t.confidence })),
      path: climb.length
        ? climb
        : bedrock
          ? session.current.climbPath(bedrock.nodeId, wallNode?.id ?? '')
          : [],
      asked: session.current.steps.map((st) => ({
        nodeId: st.nodeId,
        correct: st.correct,
      })),
      questionCount: session.current.steps.length,
    }
  }, [climb, bedrock, wallNode])

  return {
    phase,
    item,
    brief,
    wallItem,
    firstAttempt,
    bedrock,
    climb,
    climbAt,
    woke,
    wokeTotal,
    beginClimb,
    lightUp,
    lit,
    asked,
    trail,
    why,
    beliefs: session.current.beliefs,
    itemsUsed: session.current.asked.size,
    wallNode,
    nodeOf,
    start,
    answer,
    beginRepair,
    masteryOf: (id: string) => session.current.beliefs[id] ?? 0.5,
    tick,
  }
}
