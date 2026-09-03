/**
 * Learning Pack: everything the child needs, offline.
 *
 * A pack covers the full descent corridor beneath one wall problem -- the wall
 * plus every skill it transitively rests on -- so a descent can never walk off
 * the cached edge mid-diagnosis. Fetched once, then served from IndexedDB.
 */
import type { SkillGraph } from '@engine/types'

export type ItemKind = 'arithmetic' | 'compare' | 'partition' | 'cut' | 'place'

export interface Item {
  kind: ItemKind
  stem: string
  options: string[]
  answer_index: number
  grade: string
  node: string
  node_id: string
  misconception?: string
  expression?: string
  left?: string
  right?: string
  parts?: number
  shaded?: number
  equal_parts?: boolean
  expects_none_correct?: boolean
  target?: number      // cut: how many equal pieces
  tolerance?: number   // cut: how close counts as equal
  value?: string       // place: the fraction to position
  max?: number         // place: right end of the line
  ticks?: number       // place: how many divisions
}

/** Hands-on items have no option list; they report correctness themselves. */
export function isHandsOn(i: Item): boolean {
  return i.kind === 'cut' || i.kind === 'place'
}

export interface PackNode {
  id: string
  code: string
  grade: string
  depth: number
  text: string
  /** Child-facing name. null means this node has no wording a child can read. */
  kid: string | null
  teacher: string
  reteach: string
}

export interface Pack {
  wall: string
  corridor: string[]
  nodes: PackNode[]
  edges: [string, string][]
  items: Item[]
  _stats: Record<string, number>
}

import { get as dbGet, put as dbPut } from './db'

const PACK_STORE = 'packs' as const

/**
 * Cache first, network second. That ordering is the offline promise: once a
 * pack has been seen, the game never waits on a network it may not have.
 */
export async function loadPack(url = './pack.json'): Promise<Pack> {
  const hit = await dbGet<Pack>(PACK_STORE, url)
  if (hit) return hit
  const res = await fetch(url)
  if (!res.ok) throw new Error(`could not load pack (${res.status})`)
  const pack = (await res.json()) as Pack
  void dbPut(PACK_STORE, url, pack)
  return pack
}

/** The pack's own subgraph, in the shape the engine expects. */
export function toGraph(pack: Pack): SkillGraph {
  return {
    nodes: pack.nodes.map((n) => ({
      id: n.id,
      code: n.code,
      grade: n.grade,
      depth: n.depth,
      text: n.text,
      skills: [],
    })),
    edges: pack.edges,
  }
}

export function nodeByCode(pack: Pack, code: string): PackNode | undefined {
  return pack.nodes.find((n) => n.code === code)
}

/**
 * What a child should be called this skill. Falls back to the teacher wording
 * rather than to the standard code -- "5.NF.A.1" on screen would be worse than
 * anything, and a missing kid name is a content bug we want to notice.
 */
export function kidName(n: PackNode | undefined): string {
  if (!n) return 'this skill'
  return n.kid ?? n.teacher
}

/**
 * Pick an unseen item for a node.
 *
 * `prefer` matters more than it looks. A diagnostic descent wants eight quick
 * reads -- making a child drag cuts around for every one of them is slow and
 * tiring, and the descent is not where the learning happens. Repair is: she is
 * staying a while, and that is exactly where the hands-on instrument earns its
 * time. So the same node serves a fast item on the way down and a manipulative
 * once we stop to fix it.
 */
export function pickItem(
  pack: Pack,
  nodeId: string,
  seen: Set<string>,
  prefer: 'quick' | 'handsOn' = 'quick',
): Item | null {
  const pool = pack.items.filter((i) => i.node_id === nodeId)
  if (!pool.length) return null
  const fresh = pool.filter((i) => !seen.has(itemKey(i)))
  const usable = fresh.length ? fresh : pool
  const wanted = usable.filter((i) =>
    prefer === 'handsOn' ? isHandsOn(i) : !isHandsOn(i))
  return (wanted.length ? wanted : usable)[0] ?? null
}

export function itemKey(i: Item): string {
  return `${i.node_id}|${i.stem}|${i.options.join(',')}`
}

export function isCorrect(item: Item, chosen: number): boolean {
  return chosen === item.answer_index
}
