/**
 * Which problem she starts on.
 *
 * Six topic families, because that is what the K-5 graph actually holds:
 * Measuring (41 skills), Times tables (34), Big numbers (32), Fractions (23),
 * Shapes (21), Counting (8). Fractions is only the fourth largest -- it looked
 * like the whole app for a while purely because it was the only family whose
 * skills had child-facing names.
 *
 * A wall needs real depth beneath it. A skill with two prerequisites gives the
 * descent nothing to search, so the product's whole idea misfires on it; these
 * are all chosen with a corridor worth descending.
 */
import type { Pack } from './pack'

export interface Topic {
  id: string
  label: string
  icon: string
  /** Wall code per grade. Falls back DOWN the grades, never up. */
  byGrade: Record<string, string>
}

export const TOPICS: Topic[] = [
  {
    id: 'fractions',
    label: 'Fractions',
    icon: '🍕',
    byGrade: { '5': '5.NF.A.1', '4': '4.NF.B.3.d', '3': '3.NF.A.3' },
  },
  {
    id: 'times',
    label: 'Times tables & word problems',
    icon: '✖️',
    byGrade: {
      '5': '4.OA.A.3', '4': '4.OA.A.3', '3': '3.OA.D.8',
      '2': '2.OA.A.1', '1': '1.OA.C.6',
    },
  },
  {
    id: 'bignumbers',
    label: 'Big numbers',
    icon: '🔢',
    byGrade: {
      '5': '5.NBT.B.7', '4': '4.NBT.B.5', '3': '4.NBT.B.5',
      '2': '2.NBT.B.5', '1': '1.NBT.C.4',
    },
  },
  {
    id: 'measuring',
    label: 'Measuring',
    icon: '📏',
    byGrade: { '5': '5.MD.A.1', '4': '4.MD.A.2', '3': '3.MD.D.8' },
  },
  {
    id: 'shapes',
    label: 'Shapes',
    icon: '🔷',
    byGrade: { '5': '5.G.B.4', '4': '5.G.B.4', '3': '3.G.A.2' },
  },
]

export const GRADES = ['1', '2', '3', '4', '5'] as const

/**
 * The wall for this topic at this grade, falling back DOWN the grades. Offering
 * a child something above her grade is how the product becomes the thing it
 * exists to replace.
 */
export function wallFor(
  pack: Pack,
  topic: Topic,
  grade: string,
): string | null {
  const have = new Set(pack.nodes.map((n) => n.code))
  const order = [grade, ...GRADES.filter((g) => g < grade).reverse()]
  for (const g of order) {
    const code = topic.byGrade[g]
    if (code && have.has(code)) return code
  }
  return null
}

/** Topics we can actually serve at this grade, given what the pack holds. */
export function topicsFor(pack: Pack, grade: string): Topic[] {
  return TOPICS.filter((t) => wallFor(pack, t, grade) !== null)
}

/** Which family a skill belongs to — used to group the Grove's trees. */
export function familyOf(code: string): string {
  if (code.includes('.NF')) return 'fractions'
  if (code.includes('.OA')) return 'times'
  if (code.includes('.NBT')) return 'bignumbers'
  if (code.includes('.MD')) return 'measuring'
  if (code.includes('.G.')) return 'shapes'
  if (code.includes('.CC')) return 'counting'
  return 'other'
}
