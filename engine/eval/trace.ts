/**
 * What a child ACTUALLY sees, question by question.
 *
 * Every number we have measures whether the engine finds the right gap. None
 * of them look at the thing a child experiences: the sequence of stems. Two
 * complaints came straight off that blind spot -- "I got a simple question at
 * grade 5 and the ones underneath were harder", and "how does every word
 * problem end up in big numbers" -- and neither is visible in an accuracy
 * table.
 *
 * So this prints the real items, in the real order, chosen by the real
 * selection policy, with the grade and family of each. It answers the two
 * complaints with evidence rather than argument.
 *
 * Run: npx tsx eval/trace.ts [wallCode] [seed]
 */
import { readFileSync } from 'node:fs'
import { Graph } from '../src/graph'
import { GapPosterior } from '../src/diagnosis'
import { DEFAULT_CONFIG } from '../src/types'
import type { SkillGraph } from '../src/types'

const PACK = process.env.TAPROOT_PACK ?? 'D:/taproot/app/public/pack.json'
const pack = JSON.parse(readFileSync(PACK, 'utf-8'))

const data: SkillGraph = {
  nodes: pack.nodes.map((n: any) => ({
    id: n.id, code: n.code, grade: n.grade, depth: n.depth,
    text: n.text ?? '', kid: n.kid, teacher: n.teacher,
  })),
  edges: pack.edges,
}
const graph = new Graph(data)

const WALL = process.argv[2] ?? '5.NF.A.1'
const SEED = Number(process.argv[3] ?? 7)

const byCode = new Map<string, any>(pack.nodes.map((n: any) => [n.code, n]))
const byId = new Map<string, any>(pack.nodes.map((n: any) => [n.id, n]))
const wall = byCode.get(WALL)
if (!wall) { console.error(`no such wall: ${WALL}`); process.exit(1) }

const itemsFor = (nodeId: string) =>
  pack.items.filter((i: any) => i.node_id === nodeId)

const fam = (c: string) =>
  c.includes('.NF') ? 'Fractions'
  : c.includes('.OA') ? 'Times tables'
  : c.includes('.NBT') ? 'Big numbers'
  : c.includes('.MD') ? 'Measuring'
  : c.includes('.CC') ? 'Counting'
  : c.includes('.G.') ? 'Shapes' : '?'

function rng(seed: number) {
  let s = seed >>> 0
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
}
const rand = rng(SEED)

/**
 * A crude but honest proxy for how hard a stem LOOKS to a child: how much she
 * has to read and how many numbers she has to hold. It is not a difficulty
 * model, it is a legibility check -- exactly the thing the accuracy tables
 * cannot see.
 */
function load(stem: string) {
  const words = stem.trim().split(/\s+/).length
  const nums = (stem.match(/\d+/g) ?? []).length
  return { words, nums }
}

const corridor = [wall.id, ...graph.ancestors(wall.id)]
const candidates = corridor.filter((id) => id !== wall.id)
const post = new GapPosterior(graph, candidates, DEFAULT_CONFIG.bkt)

console.log(`\nWALL  ${WALL}  grade ${wall.grade}  ${wall.kid ?? wall.teacher}`)
console.log(`corridor ${corridor.length} skills, family ${fam(wall.code)}\n`)
console.log('  #  gr  family        words nums  stem')
console.log('  ' + '-'.repeat(96))

function show(n: number, node: any, stem: string) {
  const { words, nums } = load(stem)
  const flag = words > 14 ? ' <-- long' : ''
  console.log(
    `  ${String(n).padStart(2)}  ${String(node.grade).padStart(2)}  ` +
    `${fam(node.code).padEnd(13)} ${String(words).padStart(4)} ` +
    `${String(nums).padStart(4)}  ${stem.slice(0, 62)}${flag}`,
  )
}

// the wall itself, which she gets wrong -- that is what starts a descent
const wallItems = itemsFor(wall.id)
const wallItem = wallItems[Math.floor(rand() * Math.max(wallItems.length, 1))]
show(1, wall, wallItem ? wallItem.stem : '(no item!)')
post.update(wall.id, false)

const count = new Map<string, number>()
const seenStems: string[] = wallItem ? [wallItem.stem] : []
const grades: number[] = [wall.grade === 'K' ? 0 : Number(wall.grade)]
const wordCounts: number[] = wallItem ? [load(wallItem.stem).words] : []
let n = 1

while (n < DEFAULT_CONFIG.maxItems) {
  if (post.best().confidence >= DEFAULT_CONFIG.gapConfidence) break
  const exhausted = new Set(
    [...count.entries()]
      .filter(([, c]) => c >= DEFAULT_CONFIG.repeatCap).map(([k]) => k),
  )
  const pick = post.choose(candidates, exhausted)
  if (!pick) break
  const node = byId.get(pick)
  const its = itemsFor(pick)
  const it = its[Math.floor(rand() * Math.max(its.length, 1))]
  n++
  show(n, node, it ? it.stem : '(NO ITEM FOR THIS SKILL)')
  if (it) { seenStems.push(it.stem); wordCounts.push(load(it.stem).words) }
  grades.push(node.grade === 'K' ? 0 : Number(node.grade))
  post.update(pick, false)   // she is failing everything, so it keeps digging
  count.set(pick, (count.get(pick) ?? 0) + 1)
}

const best = post.best()
const gapNode = byId.get(best.nodeId)
console.log(`\n  gap: ${gapNode?.code} (grade ${gapNode?.grade}) ` +
            `${gapNode?.kid ?? ''}  at ${Math.round(best.confidence * 100)}%`)

// ---- the two complaints, answered with numbers ---------------------------
console.log('\n  DIFFICULTY SHAPE (does it get easier as it goes down?)')
const rises = wordCounts.slice(1).filter((w, i) => w > wordCounts[i]).length
console.log(`    words per stem, in order: ${wordCounts.join(' ')}`)
console.log(`    grade, in order:          ${grades.join(' ')}`)
console.log(`    steps where the stem got LONGER than the one before: ` +
            `${rises} of ${wordCounts.length - 1}`)
const monotone = grades.every((g, i) => i === 0 || g <= grades[i - 1])
console.log(`    grade never increases while descending: ${monotone}`)

console.log('\n  FAMILY DRIFT (where do the questions come from?)')
const famCount = new Map<string, number>()
for (const g of [wall.id, ...[...count.keys()]]) {
  const f = fam(byId.get(g).code)
  famCount.set(f, (famCount.get(f) ?? 0) + 1)
}
for (const [f, c] of [...famCount.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`    ${f.padEnd(13)} ${c}`)
}

const dupes = seenStems.length - new Set(seenStems).size
console.log(`\n  repeated stems in this session: ${dupes}`)
