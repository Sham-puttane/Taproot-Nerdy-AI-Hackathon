/**
 * Which problem she starts on.
 *
 * Until now every session opened on the same grade-5 fraction question, which
 * made "bring a problem that beat you" a promise the app did not keep -- and
 * would have served unlike denominators to a seven-year-old.
 *
 * A wall has to have real depth beneath it. A skill with two prerequisites
 * gives the descent nothing to search, so the product's whole idea misfires on
 * it. Only nodes with a corridor of at least eight skills, and with items to
 * ask, qualify.
 */
import type { Pack } from './pack'

export interface Topic {
  id: string
  label: string
  icon: string
  /** Wall code per grade, hardest-first within the topic. */
  byGrade: Record<string, string>
}

export const TOPICS: Topic[] = [
  {
    id: 'fractions',
    label: 'Fractions',
    icon: '🍕',
    byGrade: {
      '5': '5.NF.A.1',
      '4': '4.NF.B.3.d',
      '3': '3.NF.A.3',
    },
  },
  {
    id: 'sharing',
    label: 'Sharing things equally',
    icon: '🧩',
    byGrade: {
      '5': '4.NF.A.1',
      '4': '4.NF.A.1',
      '3': '3.NF.A.1',
    },
  },
  {
    id: 'wordproblems',
    label: 'Word problems',
    icon: '📖',
    byGrade: {
      '5': '2.OA.A.1',
      '4': '2.OA.A.1',
      '3': '2.OA.A.1',
      '2': '2.OA.A.1',
    },
  },
  {
    id: 'bignumbers',
    label: 'Big numbers',
    icon: '🔢',
    byGrade: {
      '5': '1.NBT.C.4',
      '4': '1.NBT.C.4',
      '3': '1.NBT.C.4',
      '2': '1.NBT.C.4',
      '1': '1.OA.C.6',
    },
  },
]

export const GRADES = ['1', '2', '3', '4', '5'] as const

/**
 * The wall for this topic at this grade, falling back DOWN the grades rather
 * than up. Offering a child something above her grade is how the product would
 * become the thing it exists to replace.
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

/** Topics we can actually serve for this grade, given what the pack holds. */
export function topicsFor(pack: Pack, grade: string): Topic[] {
  return TOPICS.filter((t) => wallFor(pack, t, grade) !== null)
}
