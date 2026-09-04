/**
 * The wall table in src/game/walls.ts is hand-written; the pack is generated.
 * They drift in silence. Three of nineteen offerings HAD drifted -- a grade-3
 * child was handed a grade-4 standard and a grade-4 child a grade-5 one, which
 * is the one thing walls.ts says in a comment it must never do, and nothing
 * caught it for weeks.
 *
 * So it is checked on every build rather than in a test suite someone has to
 * remember to run. Exits non-zero and the build fails.
 */
import { readFileSync } from 'node:fs'

const pack = JSON.parse(readFileSync(new URL('../public/pack.json', import.meta.url), 'utf-8'))
const src = readFileSync(new URL('../src/game/walls.ts', import.meta.url), 'utf-8')

// Pull the byGrade tables straight out of the source, so the check reads what
// ships rather than a second copy that could itself drift.
const topics = []
for (const m of src.matchAll(/id:\s*'([^']+)'[\s\S]*?byGrade:\s*\{([\s\S]*?)\n\s*\},/g)) {
  const byGrade = {}
  for (const g of m[2].matchAll(/'(\d)':\s*'([^']+)'/g)) byGrade[g[1]] = g[2]
  topics.push({ id: m[1], byGrade })
}
const GRADES = ['1', '2', '3', '4', '5']

const byCode = new Map(pack.nodes.map((n) => [n.code, n]))
const prereq = new Map()
for (const [a, b] of pack.edges) {
  const l = prereq.get(b)
  if (l) l.push(a); else prereq.set(b, [a])
}
const num = (g) => (g === 'K' ? 0 : Number(g) || 0)

function wallFor(topic, grade) {
  const order = [grade, ...GRADES.filter((g) => g < grade).reverse()]
  for (const g of order) {
    const code = topic.byGrade[g]
    if (code && byCode.has(code)) return code
  }
  return null
}

function corridorSize(code) {
  const root = byCode.get(code).id
  const seen = new Set([root])
  const q = [root]
  while (q.length) {
    const x = q.shift()
    for (const y of prereq.get(x) ?? []) if (!seen.has(y)) { seen.add(y); q.push(y) }
  }
  return seen.size
}

const problems = []
if (!topics.length) problems.push('could not parse any topics out of walls.ts')

for (const t of topics) {
  for (const [g, code] of Object.entries(t.byGrade)) {
    if (!byCode.has(code)) problems.push(`${t.id} grade ${g}: ${code} is not in the pack`)
  }
  for (const g of GRADES) {
    const code = wallFor(t, g)
    if (!code) continue
    const wg = byCode.get(code).grade
    if (num(wg) > num(g)) {
      problems.push(`${t.id} grade ${g} -> ${code}, a GRADE ${wg} standard: above the grade she picked`)
    }
    const size = corridorSize(code)
    if (size <= 5) {
      problems.push(`${t.id} grade ${g} -> ${code}: only ${size} skills beneath it, nothing to descend through`)
    }
  }
}
for (const g of GRADES) {
  const offered = topics.filter((t) => wallFor(t, g)).length
  if (!offered) problems.push(`grade ${g} is offered nothing at all`)
}

if (problems.length) {
  console.error('\nwall table does not match the pack:\n')
  for (const p of problems) console.error('  - ' + p)
  console.error('')
  process.exit(1)
}

const summary = GRADES.map((g) => `gr${g}:${topics.filter((t) => wallFor(t, g)).length}`).join(' ')
console.log(`walls ok - ${topics.length} topics, all at or below grade, all with depth  (${summary})`)
