/**
 * What each tree actually knows about itself.
 *
 * The six trees are not decoration: each one stands for a topic family in the
 * K-5 graph, and its size, fruit and root depth come from real progress. A
 * tree that looked healthy while the child had lit nothing would be the
 * product lying to her on the home screen.
 */
import type { Pack } from '../game/pack'
import type { Progress } from '../game/progress'
import { familyOf } from '../game/walls'

export interface Family {
  id: string
  label: string
  /** Lit = mastery belief has cleared the bar at some point. */
  lit: number
  total: number
  /** Deepest grade she has lit anything in, 0 = kindergarten. */
  deepestGrade: number
  /** Keystones repaired inside this family. */
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

export function families(
  pack: Pack,
  progress: Progress,
  threshold = 0.75,
): Family[] {
  const acc = new Map<string, Family>()
  for (const id of ORDER) {
    acc.set(id, {
      id, label: LABEL[id] ?? id, lit: 0, total: 0,
      deepestGrade: 99, keystones: 0,
    })
  }

  for (const n of pack.nodes) {
    const f = acc.get(familyOf(n.code))
    if (!f) continue
    f.total++
    if ((progress.mastery[n.id] ?? 0) >= threshold) {
      f.lit++
      f.deepestGrade = Math.min(f.deepestGrade, gradeNum(n.grade))
    }
  }
  for (const k of progress.keystones) {
    const f = acc.get(familyOf(k.code))
    if (f) f.keystones++
  }

  return ORDER.map((id) => acc.get(id)!)
    .filter((f) => f.total > 0)
    .map((f) => ({ ...f, deepestGrade: f.deepestGrade === 99 ? -1 : f.deepestGrade }))
}

/** 0 = nothing planted, 1 = every skill in the family lit. */
export function health(f: Family): number {
  return f.total ? Math.min(1, f.lit / f.total) : 0
}
