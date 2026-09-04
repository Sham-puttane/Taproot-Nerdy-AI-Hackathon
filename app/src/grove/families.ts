/**
 * What each tree actually knows about itself.
 *
 * The six trees are not decoration: each one stands for a topic in the K-5
 * graph, and its size, fruit and root depth come from real progress. A tree
 * that looked healthy while the child had lit nothing would be the product
 * lying to her on the home screen.
 *
 * A tree's roots are its CORRIDOR -- every skill its wall rests on -- not the
 * skills that happen to share its standard prefix. That distinction is the
 * whole product. Filing each skill under exactly one tree meant a child could
 * dig under Fractions, have the engine correctly find a kindergarten SHAPES
 * gap, repair it, and come back to a Grove where the fractions tree was still
 * a seed and a tree she had never touched had grown. It looked like a bug, and
 * it was really the home screen contradicting the thing the app had just spent
 * ten questions teaching her: that these subjects hold each other up.
 *
 * So a skill belongs to every tree whose corridor contains it, and one
 * kindergarten idea can visibly feed several trees at once. Measured on the
 * shipped pack, Big numbers at grade 5 has 16 fraction skills in its corridor
 * and Fractions at grade 3 has 8 shape skills in its -- this is the normal
 * case, not a rare flourish.
 */
import type { Pack } from '../game/pack'
import type { Progress } from '../game/progress'
import { TOPICS, familyOf } from '../game/walls'

export interface Family {
  id: string
  label: string
  /** Lit = mastery belief has cleared the bar at some point. */
  lit: number
  total: number
  /** Deepest grade she has lit anything in, 0 = kindergarten. */
  deepestGrade: number
  /** Keystones repaired anywhere inside this tree's corridor. */
  keystones: number
}

const LABEL: Record<string, string> = {
  fractions: 'Fractions',
  times: 'Times tables',
  bignumbers: 'Big numbers',
  measuring: 'Measuring',
  shapes: 'Shapes',
  counting: 'Counting',
}

const ORDER = ['fractions', 'times', 'bignumbers', 'measuring', 'shapes', 'counting']

const gradeNum = (g: string) => (g === 'K' ? 0 : Number(g) || 0)

/** Every skill the given node rests on, plus the node itself. */
function corridorOf(
  prereq: Map<string, string[]>,
  rootId: string,
): Set<string> {
  const seen = new Set([rootId])
  const queue = [rootId]
  while (queue.length) {
    const cur = queue.shift()!
    for (const down of prereq.get(cur) ?? []) {
      if (!seen.has(down)) { seen.add(down); queue.push(down) }
    }
  }
  return seen
}

/**
 * Which skills sit under each tree: the corridor of that topic's
 * deepest-reaching wall, so the tree covers everything a child could reach by
 * digging under it.
 */
function membership(pack: Pack): Map<string, Set<string>> {
  const prereq = new Map<string, string[]>()
  for (const [a, b] of pack.edges as [string, string][]) {
    const list = prereq.get(b)
    if (list) list.push(a)
    else prereq.set(b, [a])
  }
  const byCode = new Map(pack.nodes.map((n) => [n.code, n]))
  const out = new Map<string, Set<string>>()

  for (const topic of TOPICS) {
    // widest corridor wins -- the highest grade this topic offers
    let best: Set<string> | null = null
    for (const code of Object.values(topic.byGrade)) {
      const node = byCode.get(code)
      if (!node) continue
      const c = corridorOf(prereq, node.id)
      if (!best || c.size > best.size) best = c
    }
    if (best) out.set(topic.id, best)
  }

  // Counting is nobody's wall -- it is the floor every corridor lands on -- so
  // it keeps prefix membership. Without this it would have no tree at all.
  const counting = new Set<string>()
  for (const n of pack.nodes) {
    if (familyOf(n.code) === 'counting') counting.add(n.id)
  }
  if (counting.size) out.set('counting', counting)

  return out
}

export function families(
  pack: Pack,
  progress: Progress,
  threshold = 0.75,
): Family[] {
  const member = membership(pack)
  const byId = new Map(pack.nodes.map((n) => [n.id, n]))
  const keystoneIds = new Set(progress.keystones.map((k) => k.nodeId))

  return ORDER.map((id) => {
    const ids = member.get(id)
    const f: Family = {
      id, label: LABEL[id] ?? id, lit: 0, total: ids?.size ?? 0,
      deepestGrade: 99, keystones: 0,
    }
    if (!ids) return f
    for (const nid of ids) {
      const node = byId.get(nid)
      if (!node) continue
      if ((progress.mastery[nid] ?? 0) >= threshold) {
        f.lit++
        f.deepestGrade = Math.min(f.deepestGrade, gradeNum(node.grade))
      }
      if (keystoneIds.has(nid)) f.keystones++
    }
    return f
  })
    .filter((f) => f.total > 0)
    .map((f) => ({ ...f, deepestGrade: f.deepestGrade === 99 ? -1 : f.deepestGrade }))
}

/** 0 = nothing planted, 1 = every skill in the tree's corridor lit. */
export function health(f: Family): number {
  return f.total ? Math.min(1, f.lit / f.total) : 0
}
