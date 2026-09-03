/**
 * Does the engine hold up on EVERY section the game offers, or only on the
 * fraction wall the headline number was measured on?
 *
 * `sweep.ts` measures one wall (5.NF.A.1) very carefully. That is the right
 * shape for "does information gain beat asking in order", but it says nothing
 * about whether a child who picks Shapes at grade 3 gets a corridor worth
 * descending. This runs every offerable wall and reports per section, so a
 * weak one cannot hide inside an average.
 *
 * It also reports the thing the UI needed and nobody had measured: how often
 * a descent CROSSES topic families, and into which. That crossing is the most
 * interesting behaviour the product has -- a child picks "big numbers" and
 * ends up in fractions because a decimal is a fraction -- and until it was
 * counted it looked like a bug.
 *
 * Run: npx tsx eval/sections.ts [trialsPerWall] > eval/sections.json
 */
import { readFileSync } from 'node:fs'
import { Graph } from '../src/graph'
import { GapPosterior } from '../src/diagnosis'
import { DEFAULT_CONFIG } from '../src/types'
import type { SkillGraph } from '../src/types'

const OUT = process.env.TAPROOT_OUT ?? 'D:/taproot/data/processed'
const raw = JSON.parse(readFileSync(`${OUT}/cone_viz.json`, 'utf-8'))
const data: SkillGraph = { nodes: raw.nodes, edges: raw.edges }

const graph = new Graph(data)
graph.assertAcyclic()
const byCode = new Map(data.nodes.map((n) => [n.code, n.id]))

const TRIALS = Number(process.argv[2] ?? 120)

/** Exactly what game/walls.ts offers a child. Kept in step by hand. */
const SECTIONS: { topic: string; grade: string; code: string }[] = [
  { topic: 'Fractions', grade: '3', code: '3.NF.A.3' },
  { topic: 'Fractions', grade: '4', code: '4.NF.B.3.d' },
  { topic: 'Fractions', grade: '5', code: '5.NF.A.1' },
  { topic: 'Times tables', grade: '1', code: '1.OA.C.6' },
  { topic: 'Times tables', grade: '2', code: '2.OA.A.1' },
  { topic: 'Times tables', grade: '3', code: '3.OA.D.8' },
  { topic: 'Times tables', grade: '4', code: '4.OA.A.3' },
  { topic: 'Big numbers', grade: '1', code: '1.NBT.C.4' },
  { topic: 'Big numbers', grade: '2', code: '2.NBT.B.5' },
  { topic: 'Big numbers', grade: '4', code: '4.NBT.B.5' },
  { topic: 'Big numbers', grade: '5', code: '5.NBT.B.7' },
  { topic: 'Measuring', grade: '3', code: '3.MD.D.8' },
  { topic: 'Measuring', grade: '4', code: '4.MD.A.2' },
  { topic: 'Measuring', grade: '5', code: '5.MD.A.1' },
  { topic: 'Shapes', grade: '3', code: '3.G.A.2' },
  { topic: 'Shapes', grade: '5', code: '5.G.B.4' },
]

const fam = (code: string) =>
  code.includes('.NF') ? 'Fractions'
  : code.includes('.OA') ? 'Times tables'
  : code.includes('.NBT') ? 'Big numbers'
  : code.includes('.MD') ? 'Measuring'
  : code.includes('.CC') ? 'Counting'
  : code.includes('.G.') ? 'Shapes'
  : '?'

function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

function hopsBetween(a: string, b: string): number | null {
  if (a === b) return 0
  const seen = new Set([a])
  let frontier = [a]
  for (let d = 1; d <= 8; d++) {
    const next: string[] = []
    for (const id of frontier) {
      for (const nb of [
        ...(graph.prereqs.get(id) ?? []),
        ...(graph.dependents.get(id) ?? []),
      ]) {
        if (seen.has(nb)) continue
        if (nb === b) return d
        seen.add(nb)
        next.push(nb)
      }
    }
    if (!next.length) break
    frontier = next
  }
  return null
}

interface SectionResult {
  topic: string
  grade: string
  code: string
  corridor: number
  plantable: number
  /** deepest grade the descent can possibly reach from here */
  floor: string
  trials: number
  exact: number
  within1: number
  diagnosed: number
  meanItems: number
  /** how often the descent left the topic the child picked */
  crossRate: number
  crossInto: Record<string, number>
  /** the single deepest correct find, for the demo */
  deepestFind: { planted: string; grades: number } | null
}

const results: SectionResult[] = []

for (const s of SECTIONS) {
  const wallId = byCode.get(s.code)
  if (!wallId) {
    console.error(`MISSING FROM GRAPH: ${s.code}`)
    continue
  }
  const corridor = [wallId, ...graph.ancestors(wallId)]
  const candidates = corridor.filter((id) => id !== wallId)
  const plantable = candidates.filter(
    (id) => (graph.dependents.get(id) ?? []).length > 0,
  )
  const gnum = (g: string) => (g === 'K' ? 0 : Number(g) || 0)
  const floor = corridor.reduce(
    (lo, id) => Math.min(lo, gnum(graph.node(id).grade)), 9)

  if (!plantable.length) {
    results.push({
      ...s, corridor: corridor.length, plantable: 0,
      floor: floor === 0 ? 'K' : String(floor),
      trials: 0, exact: 0, within1: 0, diagnosed: 0, meanItems: 0,
      crossRate: 0, crossInto: {}, deepestFind: null,
    })
    continue
  }

  let exact = 0, within1 = 0, diagnosed = 0, items = 0
  let crossed = 0
  const crossInto: Record<string, number> = {}
  let deepestFind: SectionResult['deepestFind'] = null

  for (let t = 0; t < TRIALS; t++) {
    const rand = rng(1000 + t * 7919)
    const gapId = plantable[Math.floor(rand() * plantable.length)]
    const broken = new Set([gapId, ...graph.descendants(gapId)])
    const { slip, guess } = DEFAULT_CONFIG.bkt
    const respond = (id: string) =>
      broken.has(id) ? rand() < guess : rand() > slip

    const cfg = DEFAULT_CONFIG
    const post = new GapPosterior(graph, candidates, cfg.bkt)
    post.update(wallId, false)
    const count = new Map<string, number>()
    const asked: string[] = []
    let n = 1
    while (n < cfg.maxItems) {
      if (post.best().confidence >= cfg.gapConfidence) break
      const exhausted = new Set(
        [...count.entries()].filter(([, c]) => c >= cfg.repeatCap).map(([k]) => k),
      )
      const pick = post.choose(candidates, exhausted)
      if (!pick) break
      post.update(pick, respond(pick))
      count.set(pick, (count.get(pick) ?? 0) + 1)
      asked.push(pick)
      n++
    }
    items += n

    // did the path leave the topic she picked?
    const wallFam = fam(s.code)
    const others = asked
      .map((id) => fam(graph.code(id)))
      .filter((f) => f !== wallFam && f !== '?')
    if (others.length) {
      crossed++
      for (const f of new Set(others)) crossInto[f] = (crossInto[f] ?? 0) + 1
    }

    const b = post.best()
    if (b.confidence >= cfg.gapConfidence) {
      diagnosed++
      const h = hopsBetween(b.nodeId, gapId)
      if (b.nodeId === gapId) {
        exact++
        const drop = gnum(graph.node(wallId).grade) - gnum(graph.node(gapId).grade)
        if (!deepestFind || drop > deepestFind.grades) {
          deepestFind = { planted: graph.code(gapId), grades: drop }
        }
      }
      if (h !== null && h <= 1) within1++
    }
  }

  results.push({
    ...s,
    corridor: corridor.length,
    plantable: plantable.length,
    floor: floor === 0 ? 'K' : String(floor),
    trials: TRIALS,
    exact: exact / TRIALS,
    within1: within1 / TRIALS,
    diagnosed: diagnosed / TRIALS,
    meanItems: items / TRIALS,
    crossRate: crossed / TRIALS,
    crossInto,
    deepestFind,
  })
}

console.log(JSON.stringify({ trialsPerWall: TRIALS, results }, null, 2))
