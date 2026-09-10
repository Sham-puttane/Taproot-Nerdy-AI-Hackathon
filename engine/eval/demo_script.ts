/**
 * The exact answers to give on camera, computed rather than hunted for.
 *
 * demo_path.ts found that ZERO walls reach an array if you answer everything
 * wrong -- which is what everyone does when demoing, and why the instrument
 * looked missing. Failing every question drives the descent to the FLOOR, and
 * the floor is counting and naming shapes. Arrays live on middle-grade
 * multiplication skills, which are never the bedrock when nothing is held.
 *
 * That is not a bug in the engine. It is the engine being right: if a child
 * cannot count, the array is not her problem. But it does mean a demo has to
 * answer some questions CORRECTLY, so the posterior can rule the floor out
 * and settle higher up.
 *
 * So: plant the gap where the instrument lives, respond the way a learner with
 * that gap actually would, and print the per-question script.
 *
 * Run: npx tsx eval/demo_script.ts groups
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
const itemsOf = (id: string) =>
  pack.items.filter((i: any) => i.node_id === id)
const serves = (id: string, kind: string) =>
  itemsOf(id).some((i: any) => i.kind === kind)

const OFFERS: { grade: string; topic: string; code: string }[] = [
  { grade: '2', topic: 'Times tables', code: '2.OA.A.1' },
  { grade: '3', topic: 'Times tables', code: '3.OA.D.8' },
  { grade: '4', topic: 'Times tables', code: '4.OA.A.3' },
  { grade: '3', topic: 'Big numbers', code: '3.NBT.A.3' },
  { grade: '4', topic: 'Big numbers', code: '4.NBT.B.5' },
  { grade: '5', topic: 'Big numbers', code: '5.NBT.B.7' },
  { grade: '4', topic: 'Measuring', code: '4.MD.A.2' },
  { grade: '5', topic: 'Fractions', code: '5.NF.A.1' },
]

/**
 * A learner who holds everything except this gap and what stands on it. This
 * is the same model the accuracy eval uses, minus the noise -- a demo wants
 * the deterministic case.
 */
function run(wallCode: string, gapId: string) {
  const wall = byCode.get(wallCode)
  if (!wall) return null
  const corridor = [wall.id, ...graph.ancestors(wall.id)]
  if (!corridor.includes(gapId)) return null
  const candidates = corridor.filter((id) => id !== wall.id)

  const broken = new Set([gapId, ...graph.descendants(gapId)])
  const post = new GapPosterior(graph, candidates, DEFAULT_CONFIG.bkt)
  post.update(wall.id, false)

  const script: { n: number; node: any; answer: 'WRONG' | 'RIGHT' }[] = []
  const count = new Map<string, number>()
  let n = 1
  while (n < DEFAULT_CONFIG.maxItems) {
    if (post.best().confidence >= DEFAULT_CONFIG.gapConfidence) break
    const exhausted = new Set(
      [...count.entries()]
        .filter(([, c]) => c >= DEFAULT_CONFIG.repeatCap).map(([k]) => k))
    const pick = post.choose(candidates, exhausted)
    if (!pick) break
    const correct = !broken.has(pick)
    post.update(pick, correct)
    count.set(pick, (count.get(pick) ?? 0) + 1)
    n++
    script.push({ n, node: byId.get(pick), answer: correct ? 'RIGHT' : 'WRONG' })
  }
  const b = post.best()
  return { wall, script, found: byId.get(b.nodeId), hit: b.nodeId === gapId,
           confidence: b.confidence }
}

// Every skill that can serve the instrument, tried against every wall.
const targets = pack.nodes.filter((n: any) => serves(n.id, WANT))
console.log(`\n${targets.length} skills can serve "${WANT}". `
            + `Looking for a wall that lands on one.\n`)

let best: any = null
for (const o of OFFERS) {
  for (const t of targets) {
    const r = run(o.code, t.id)
    if (!r || !r.hit) continue
    const wrongs = r.script.filter((s) => s.answer === 'WRONG').length
    // Prefer the shortest demo that still shows a real descent.
    if (!best || r.script.length < best.r.script.length) {
      best = { o, t, r, wrongs }
    }
  }
}

if (!best) {
  console.log(`No wall lands on a "${WANT}" skill even with a planted gap.`)
  console.log(`Use ?preview=${WANT} for the demo.`)
} else {
  const { o, r } = best
  console.log(`SHORTEST ROUTE TO A "${WANT.toUpperCase()}" INSTRUMENT\n`)
  console.log(`  1. Start digging`)
  console.log(`  2. Grade ${o.grade}`)
  console.log(`  3. ${o.topic}`)
  console.log(`  4. Answer the first question WRONG (any wrong option)\n`)
  console.log(`  then, in order:`)
  for (const s of r.script) {
    const name = (s.node.kid ?? s.node.code)
    console.log(`     Q${String(s.n).padStart(2)}  ${s.answer.padEnd(6)}  `
                + `(${name.slice(0, 44)})`)
  }
  console.log(`\n  5. It names: "${r.found.kid ?? r.found.code}" `
              + `(grade ${r.found.grade}, ${Math.round(r.confidence * 100)}% sure)`)
  console.log(`  6. Press "Fix it" -> the ${WANT} instrument appears`)
  console.log(`\n  ${r.script.length} questions, `
              + `${best.wrongs} wrong / ${r.script.length - best.wrongs} right`)
}
