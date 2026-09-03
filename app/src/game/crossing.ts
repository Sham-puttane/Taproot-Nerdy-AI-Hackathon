/**
 * Why the descent just changed subject.
 *
 * A child picks "Big numbers" and three questions later she is doing
 * fractions, and it looks broken. It is not: grade-5 Big numbers is
 * 5.NBT.B.7, decimals, and its prerequisite closure holds 16 fraction
 * skills because a decimal IS a fraction with a denominator of ten
 * (4.NF.C.6). Measured on the shipped pack:
 *
 *   Big numbers  gr5   73 nodes beneath   16 of them fractions
 *   Measuring    gr5   80 nodes beneath   17 of them fractions
 *   Fractions    gr3   19 nodes beneath    8 shapes, 8 measuring
 *
 * The graph was right and the product said nothing, which is the worst of
 * both: correct behaviour that reads as a bug. The crossing is in fact the
 * single most interesting thing the app knows -- that these subjects are not
 * separate -- so it should be announced, not hidden.
 */

export type Family = 'NF' | 'OA' | 'NBT' | 'MD' | 'G' | 'CC' | '?'

export function familyOfCode(code: string): Family {
  if (code.includes('.NF')) return 'NF'
  if (code.includes('.OA')) return 'OA'
  if (code.includes('.NBT')) return 'NBT'
  if (code.includes('.MD')) return 'MD'
  if (code.includes('.CC')) return 'CC'
  if (code.includes('.G.')) return 'G'
  return '?'
}

const LABEL: Record<Family, string> = {
  NF: 'fractions',
  OA: 'times tables',
  NBT: 'big numbers',
  MD: 'measuring',
  G: 'shapes',
  CC: 'counting',
  '?': 'something else',
}

/**
 * The named ones are real mathematical facts, not flavour text -- each is the
 * reason the Coherence Map draws that edge. Anything unnamed falls back to a
 * true sentence rather than a made-up one.
 */
const WHY: Partial<Record<`${Family}>${Family}`, string>> = {
  'NBT>NF': 'Decimals ARE fractions — 0.7 is seven tenths. So this goes through fractions.',
  'NF>NBT': 'Fractions lean on place value: tenths and hundredths are just smaller places.',
  'NF>G': 'Fractions started as cutting shapes into equal pieces. That is where we are looking.',
  'G>NF': 'Splitting a shape fairly IS a fraction. Same idea, drawn instead of written.',
  'NF>MD': 'Fractions and measuring are the same move: how many of THIS fit in THAT.',
  'MD>NF': 'A ruler is a number line cut into fractions, so this goes through fractions.',
  'MD>G': 'Measuring a shape needs the shape first — area and sides come before the number.',
  'G>MD': 'Shapes are measured before they are named, so we check the measuring.',
  'NBT>OA': 'Big numbers are built by grouping — that is multiplication underneath.',
  'OA>NBT': 'Times tables rest on place value: 4 × 30 is 4 × 3 with a bigger place.',
  'OA>CC': 'Multiplying is fast counting, so we drop down to the counting it speeds up.',
  'NBT>CC': 'Place value is counting in groups, so we check the counting first.',
  'MD>OA': 'Measuring turns into multiplying the moment you have rows and columns.',
  'OA>MD': 'Times tables show up in measuring first — arrays, areas, groups of units.',
}

/**
 * A sentence for the moment the descent leaves the topic she picked, or null
 * when it has not.
 */
export function crossingNote(
  fromCode: string,
  toCode: string,
): string | null {
  const a = familyOfCode(fromCode)
  const b = familyOfCode(toCode)
  if (a === b || a === '?' || b === '?') return null
  return (
    WHY[`${a}>${b}`] ??
    `${LABEL[a][0].toUpperCase()}${LABEL[a].slice(1)} sits on top of ${LABEL[b]} here — same ladder, different rung.`
  )
}

export const familyLabel = (code: string) => LABEL[familyOfCode(code)]
