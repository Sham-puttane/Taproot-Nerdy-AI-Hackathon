/**
 * The loop: Wall -> Descent -> Bedrock -> Repair -> Climb -> Return.
 *
 * All of it runs on the local engine and the cached pack. No network, no
 * model call, nothing that can fail because a service is slow.
 */
import { useCallback, useMemo, useRef, useState } from 'react'
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
  const [climbAt, setClimbAt] = useState(0)
  const [lit, setLit] = useState<Set<string>>(new Set())
  const [asked, setAsked] = useState<string[]>([])
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
        session.current.seedFromWall(item.node_id)
        setPhase('descent')
        setTick((t) => t + 1)
        advanceDescent()
        return
      }

      if (phase === 'descent') {
        session.current.answer(item.node_id, correct)
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
          setPhase('climb')
          const nextNode = path[1]
          setItem(nextNode ? take(nextNode) : null)
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
        }
        const at = climbAt + 1
        setClimbAt(at)
        const upcoming = climb[at + 1]
        if (upcoming) {
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
    lit,
    asked,
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
