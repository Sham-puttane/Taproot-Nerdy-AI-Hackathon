/**
 * The exact route to a given instrument, so a demo is a script and not a hunt.
 *
 * "Get things wrong until it names a multiplication skill" is not an
 * instruction anyone can follow on camera. The engine is deterministic given
 * the answers, so the route can simply be computed: for every wall the picker
 * offers, answer everything wrong and report where the descent lands and what
 * that skill can actually serve at Repair.
 *
 * Run: npx tsx eval/demo_path.ts groups
 */
import { readFileSync } from 'node:fs'
import { Graph } from '../src/graph'
import { GapPosterior } from '../src/diagnosis'
import { DEFAULT_CONFIG } from '../src/types'
import type { SkillGraph } from '../src/types'

const PACK = process.env.TAPROOT_PACK ?? 'D:/taproot/app/public/pack.json'
const pack = JSON.parse(readFileSync(PACK, 'utf-8'))
const WANT = process.argv[2] ?? 'groups'

const data: SkillGraph = {
  nodes: pack.nodes.map((n: any) => ({
    id: n.id, code: n.code, grade: n.grade, depth: n.depth,
    text: n.text ?? '', kid: n.kid, teacher: n.teacher,
  })),
  edges: pack.edges,
}
const graph = new Graph(data)
const byCode = new Map<string, any>(pack.nodes.map((n: any) => [n.code, n]))
const byId = new Map<string, any>(pack.nodes.map((n: any) => [n.id, n]))
const kindsOf = (id: string) =>
  new Set<string>(pack.items.filter((i: any) => i.node_id === id)
    .map((i: any) => i.kind))

/** Exactly what game/walls.ts offers, kept in step by hand. */
const OFFERS: { grade: string; topic: string; code: string }[] = [
  { grade: '1', topic: 'Times tables', code: '1.OA.C.6' },
  { grade: '1', topic: 'Big numbers', code: '1.NBT.C.4' },
  { grade: '2', topic: 'Times tables', code: '2.OA.A.1' },
  { grade: '2', topic: 'Big numbers', code: '2.NBT.B.5' },
  { grade: '2', topic: 'Measuring', code: '2.MD.A.2' },
  { grade: '2', topic: 'Shapes', code: '2.G.A.3' },
  { grade: '3', topic: 'Fractions', code: '3.NF.A.3' },
  { grade: '3', topic: 'Times tables', code: '3.OA.D.8' },
  { grade: '3', topic: 'Big numbers', code: '3.NBT.A.3' },
  { grade: '3', topic: 'Measuring', code: '3.MD.D.8' },
  { grade: '3', topic: 'Shapes', code: '3.G.A.2' },
  { grade: '4', topic: 'Fractions', code: '4.NF.B.3.d' },
  { grade: '4', topic: 'Times tables', code: '4.OA.A.3' },
  { grade: '4', topic: 'Big numbers', code: '4.NBT.B.5' },
  { grade: '4', topic: 'Measuring', code: '4.MD.A.2' },
  { grade: '4', topic: 'Shapes', code: '4.G.A.2' },
  { grade: '5', topic: 'Fractions', code: '5.NF.A.1' },
  { grade: '5', topic: 'Times tables', code: '4.OA.A.3' },
  { grade: '5', topic: 'Big numbers', code: '5.NBT.B.7' },
  { grade: '5', topic: 'Measuring', code: '5.MD.A.1' },
  { grade: '5', topic: 'Shapes', code: '5.G.B.4' },
]

/**
 * Answer everything wrong, which is what a demo does. The posterior is
 * deterministic under a fixed response, so this is the route, not a sample
 * of possible routes.
 */
function descend(wallCode: string) {
  const wall = byCode.get(wallCode)
  if (!wall) return null
  const corridor = [wall.id, ...graph.ancestors(wall.id)]
  const candidates = corridor.filter((id) => id !== wall.id)
  const post = new GapPosterior(graph, candidates, DEFAULT_CONFIG.bkt)
  post.update(wall.id, false)

  const count = new Map<string, number>()
  const asked: string[] = []
  let n = 1
  while (n < DEFAULT_CONFIG.maxItems) {
    if (post.best().confidence >= DEFAULT_CONFIG.gapConfidence) break
    const exhausted = new Set(
      [...count.entries()]
        .filter(([, c]) => c >= DEFAULT_CONFIG.repeatCap).map(([k]) => k))
    const pick = post.choose(candidates, exhausted)
    if (!pick) break
    post.update(pick, false)          // wrong, every time
    count.set(pick, (count.get(pick) ?? 0) + 1)
    asked.push(pick)
    n++
  }
  const b = post.best()
  return { wall, gap: byId.get(b.nodeId), questions: n,
           confidence: b.confidence, asked }
}

console.log(`\nRoutes that end on a skill able to serve "${WANT}" at Repair\n`)
console.log('  grade  topic          questions  lands on'.padEnd(72) + 'serves')
console.log('  ' + '-'.repeat(96))

const hits: string[] = []
for (const o of OFFERS) {
  const r = descend(o.code)
  if (!r || !r.gap) continue
  const kinds = kindsOf(r.gap.id)
  const mark = kinds.has(WANT) ? '>>' : '  '
  const line =
    `${mark} ${o.grade.padEnd(6)} ${o.topic.padEnd(14)} ${
      String(r.questions).padEnd(10)} ${
      (r.gap.kid ?? r.gap.code).slice(0, 34).padEnd(36)}${
      [...kinds].sort().join(',')}`
  console.log('  ' + line)
  if (kinds.has(WANT)) {
    hits.push(`grade ${o.grade} -> ${o.topic}  (${r.questions} wrong answers, ` +
              `then Fix it) -> ${r.gap.kid ?? r.gap.code}`)
  }
}

console.log(`\n${hits.length} route(s) reach "${WANT}":`)
for (const h of hits) console.log(`   ${h}`)
if (!hits.length) {
  console.log(`   none. Every wall lands on a skill with no ${WANT} item, so`)
  console.log(`   the only way to see it is ?preview=${WANT}.`)
}
