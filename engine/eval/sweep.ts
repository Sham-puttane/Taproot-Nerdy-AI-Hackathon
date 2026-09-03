/**
 * Does targeting by information gain actually beat asking in order, or at
 * random? This is the claim the product rests on, so it gets measured rather
 * than asserted.
 *
 * Method: generate N synthetic learners, each with ONE planted gap and
 * everything else intact. Responses are noisy -- slip and guess, drawn from
 * the same BKT parameters the engine believes in -- so a policy cannot win by
 * exploiting a deterministic oracle.
 *
 * All three policies share the SAME stopping rule (`findBedrock`). Only the
 * selection differs. Otherwise we would be comparing stopping rules while
 * claiming to compare search.
 *
 * Run: npx tsx eval/sweep.ts [n] > eval/results.json
 */
import { readFileSync } from 'node:fs'
import { Graph } from '../src/graph'
import { Session } from '../src/session'
import { findBedrock, bedrockHypothesis, MIN_EVIDENCE } from '../src/selection'
import { GapPosterior } from '../src/diagnosis'
import { DEFAULT_CONFIG } from '../src/types'
import type { SkillGraph } from '../src/types'

const OUT = process.env.TAPROOT_OUT ?? 'D:/taproot/data/processed'
const raw = JSON.parse(readFileSync(`${OUT}/cone_viz.json`, 'utf-8'))
const data: SkillGraph = { nodes: raw.nodes, edges: raw.edges }

const N = Number(process.argv[2] ?? 200)
const MAX_ITEMS = Number(process.env.MAX_ITEMS ?? DEFAULT_CONFIG.maxItems)
const CONFIDENCE_STOP = Number(process.env.CONF ?? 0.5)
const BASELINE_REPEAT = Number(process.env.BASE_REPEAT ?? 4)
const PRIOR = process.env.PRIOR === '1'   // off by default: it was measured and it lost
// Where do real gaps sit? Uniform planting treats a kindergarten gap in a
// fifth grader as being as likely as a grade-4 one. REALISTIC planting draws
// gaps with the same recency bias the prior assumes, which is the honest
// place to measure a prior that encodes exactly that belief.
const REALISTIC = process.env.REALISTIC === '1'
const WALL = '5.NF.A.1'

const graph = new Graph(data)
graph.assertAcyclic()
const byCode = new Map(data.nodes.map((n) => [n.code, n.id]))
const wallId = byCode.get(WALL)!
const corridor = [wallId, ...graph.ancestors(wallId)]

// ---- deterministic RNG, so a reported number can be reproduced ------------
function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

/**
 * A learner holds everything except the planted gap and whatever builds on it.
 * Modelling her as holding only the gap's ancestors would have a fifth grader
 * failing grade-1 addition, which is not what a fraction gap looks like.
 */
function learner(gapId: string, rand: () => number) {
  const broken = new Set([gapId, ...graph.descendants(gapId)])
  const { slip, guess } = DEFAULT_CONFIG.bkt
  return (nodeId: string): boolean => {
    const knows = !broken.has(nodeId)
    return knows ? rand() > slip : rand() < guess
  }
}

type Policy = 'taproot' | 'linear' | 'random' | 'worksheet'

interface Trial {
  policy: Policy
  planted: string
  found: string | null
  items: number
  hit: boolean
  hops: number | null
  /** found.depth - planted.depth. Negative = we descended too far. */
  depthBias: number | null
  stopped: 'bedrock' | 'budget'
}

/** Graph distance between two nodes, ignoring direction. */
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

function run(policy: Policy, gapId: string, seed: number): Trial {
  const rand = rng(seed)
  const respond = learner(gapId, rand)
  const cfg = { ...DEFAULT_CONFIG, maxItems: MAX_ITEMS }

  const result = (found: string | null, items: number): Trial => ({
    policy,
    planted: graph.code(gapId),
    found: found ? graph.code(found) : null,
    items,
    hit: found === gapId,
    hops: found ? hopsBetween(found, gapId) : null,
    depthBias: found ? graph.node(found).depth - graph.node(gapId).depth : null,
    stopped: found ? 'bedrock' : 'budget',
  })

  // The honest real-world comparison. A child who fails her homework today
  // does not get an adaptive algorithm -- she gets twenty more of the same
  // problem, which is why she can do a whole page wrong and learn nothing
  // about why. It cannot descend, so it can never name a cause.
  if (policy === 'worksheet') {
    return result(null, 20)
  }

  // Every adaptive policy shares the SAME belief model and the SAME stopping
  // rule. Only the choice of what to ask next differs, which is the one thing
  // we are trying to measure.
  const candidates = corridor.filter((id) => id !== wallId)
  const post = new GapPosterior(
    graph, candidates, cfg.bkt,
    PRIOR ? graph.node(wallId).grade : undefined)
  post.update(wallId, false)

  const ordered = candidates
    .slice()
    .sort((a, b) => graph.node(a).depth - graph.node(b).depth)
  const shuffled = ordered.slice()
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  const count = new Map<string, number>()
  let n = 1
  let cursor = 0
  while (n < cfg.maxItems) {
    if (post.best().confidence >= cfg.gapConfidence) break
    const exhausted = new Set(
      [...count.entries()]
        .filter(([, c]) => c >= cfg.repeatCap)
        .map(([k]) => k),
    )
    let pick: string | null = null
    if (policy === 'taproot') {
      pick = post.choose(candidates, exhausted)
    } else {
      // Baselines confirm as they go -- each node is asked BASELINE_REPEAT
      // times before advancing. Asking once and moving on cannot beat a 25%
      // guess rate, and beating a baseline that was never allowed to gather
      // evidence would prove nothing.
      const list = policy === 'linear' ? ordered : shuffled
      while (cursor < list.length * BASELINE_REPEAT) {
        const candidate = list[Math.floor(cursor / BASELINE_REPEAT)]
        cursor++
        if (!exhausted.has(candidate)) { pick = candidate; break }
      }
    }
    if (!pick) break
    post.update(pick, respond(pick))
    count.set(pick, (count.get(pick) ?? 0) + 1)
    n++
  }

  const b = post.best()
  const ok = b.confidence >= cfg.gapConfidence
  return result(ok ? b.nodeId : null, n)
}

// Plant gaps only where a gap can plausibly BE: a node with something above it
// in the corridor. Planting at the wall itself would be trivially findable.
const plantable = corridor.filter(
  (id) => id !== wallId && (graph.dependents.get(id) ?? []).length > 0,
)

const gradeOf = (id: string) => {
  const g = graph.node(id).grade
  return g === 'K' ? 0 : Number(g) || 0
}
const wallGrade = gradeOf(wallId)
// weights for realistic planting: recent grades far likelier to be the gap
const weights = plantable.map((id) =>
  Math.exp(-0.35 * Math.max(0, wallGrade - gradeOf(id))))
const cumulative: number[] = []
weights.reduce((acc, w, i) => (cumulative[i] = acc + w), 0)
const totalW = cumulative[cumulative.length - 1]
function plantedGap(i: number): string {
  if (!REALISTIC) return plantable[i % plantable.length]
  const r = rng(90210 + i)() * totalW
  const idx = cumulative.findIndex((c) => c >= r)
  return plantable[idx < 0 ? plantable.length - 1 : idx]
}

const trials: Trial[] = []
for (let i = 0; i < N; i++) {
  const gap = plantedGap(i)
  const seed = 1000 + i * 7919
  for (const p of ['taproot', 'linear', 'random', 'worksheet'] as Policy[]) {
    trials.push(run(p, gap, seed))
  }
}

function summarise(p: Policy) {
  const t = trials.filter((x) => x.policy === p)
  const hits = t.filter((x) => x.hit).length
  const found = t.filter((x) => x.found !== null)
  const near = t.filter((x) => x.hops !== null && x.hops <= 1).length
  const mean = (xs: number[]) =>
    xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0
  return {
    policy: p,
    trials: t.length,
    itemsMean: +mean(t.map((x) => x.items)).toFixed(2),
    itemsMedian: t.map((x) => x.items).sort((a, b) => a - b)[
      Math.floor(t.length / 2)
    ],
    exactHitRate: +(hits / t.length).toFixed(3),
    within1HopRate: +(near / t.length).toFixed(3),
    diagnosedRate: +(found.length / t.length).toFixed(3),
    hitBudget: t.filter((x) => x.stopped === 'budget').length,
    tooDeep: t.filter((x) => (x.depthBias ?? 0) < 0).length,
    tooShallow: t.filter((x) => (x.depthBias ?? 0) > 0).length,
    meanDepthBias: +mean(
      t.filter((x) => x.depthBias !== null).map((x) => x.depthBias as number),
    ).toFixed(2),
  }
}

console.log(
  JSON.stringify(
    {
      wall: WALL,
      corridorNodes: corridor.length,
      plantableNodes: plantable.length,
      learners: N,
      maxItems: MAX_ITEMS,
      gapConfidence: DEFAULT_CONFIG.gapConfidence,
      repeatCap: DEFAULT_CONFIG.repeatCap,
      summary: (['taproot', 'linear', 'random', 'worksheet'] as Policy[])
        .map(summarise),
      trials,
    },
    null,
    1,
  ),
)
