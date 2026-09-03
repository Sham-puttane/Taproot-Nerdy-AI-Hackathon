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
import { DEFAULT_CONFIG } from '../src/types'
import type { SkillGraph } from '../src/types'

const OUT = process.env.TAPROOT_OUT ?? 'D:/taproot/data/processed'
const raw = JSON.parse(readFileSync(`${OUT}/cone_viz.json`, 'utf-8'))
const data: SkillGraph = { nodes: raw.nodes, edges: raw.edges }

const N = Number(process.argv[2] ?? 200)
const MAX_ITEMS = Number(process.env.MAX_ITEMS ?? DEFAULT_CONFIG.maxItems)
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
  const s = new Session(data, { maxItems: MAX_ITEMS })
  s.seedFromWall(wallId)

  // Curriculum order: most foundational first, which is what a worksheet
  // pack or a textbook chapter would do.
  const ordered = corridor
    .filter((id) => id !== wallId)
    .sort((a, b) => graph.node(a).depth - graph.node(b).depth)
  const shuffled = ordered.slice()
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  // The honest real-world comparison. A child who fails her homework today
  // does not get an adaptive algorithm -- she gets more of the same problem.
  // The worksheet asks only at the wall's own grade, never descends, and so
  // can never name a cause. It is included because "we beat a shuffled
  // adaptive search" is not the claim that matters; "we find something a
  // worksheet structurally cannot" is.
  if (policy === 'worksheet') {
    // Twenty more of the same problem. That is not a strawman -- it is what
    // the homework actually does, and it is why a child can do a page of
    // fraction problems, get most of them wrong, and learn nothing about why.
    for (let i = 0; i < 20; i++) s.answer(wallId, respond(wallId))
    const bedW = findBedrock(
      graph, s.beliefs, s.cfg, s.asked, s.scope, wallId, s.anchors)
    const foundW = bedW?.nodeId ?? null
    return {
      policy, planted: graph.code(gapId),
      found: foundW ? graph.code(foundW) : null,
      items: s.steps.length, hit: foundW === gapId,
      hops: foundW ? hopsBetween(foundW, gapId) : null,
      depthBias: foundW
        ? graph.node(foundW).depth - graph.node(gapId).depth : null,
      stopped: bedW ? 'bedrock' : 'budget',
    }
  }

  let cursor = 0
  for (;;) {
    if (s.asked.size >= MAX_ITEMS) break
    if (findBedrock(graph, s.beliefs, s.cfg, s.asked, s.scope, wallId, s.anchors)) break

    // Confirmation is SHARED protocol, not a Taproot advantage: whichever
    // policy surfaces a suspect, it must be probed twice before it can be
    // named. Otherwise the baselines are simply forbidden from ever
    // diagnosing, and the comparison measures the rule rather than the search.
    const suspect = bedrockHypothesis(
      graph, s.beliefs, s.cfg, s.asked, s.scope, wallId)
    let nodeId: string | undefined
    if (suspect && (s.anchors[suspect] ?? 0) < MIN_EVIDENCE) {
      nodeId = suspect
    } else if (policy === 'taproot') {
      nodeId = s.next()?.nodeId
    } else {
      const list = policy === 'linear' ? ordered : shuffled
      while (cursor < list.length && s.asked.has(list[cursor])) cursor++
      nodeId = list[cursor]
    }
    if (!nodeId) break
    s.answer(nodeId, respond(nodeId))
  }

  const bed = findBedrock(graph, s.beliefs, s.cfg, s.asked, s.scope, wallId, s.anchors)
  const found = bed?.nodeId ?? null
  return {
    policy,
    planted: graph.code(gapId),
    found: found ? graph.code(found) : null,
    items: s.steps.length,
    hit: found === gapId,
    hops: found ? hopsBetween(found, gapId) : null,
    depthBias: found ? graph.node(found).depth - graph.node(gapId).depth : null,
    stopped: bed ? 'bedrock' : 'budget',
  }
}

// Plant gaps only where a gap can plausibly BE: a node with something above it
// in the corridor. Planting at the wall itself would be trivially findable.
const plantable = corridor.filter(
  (id) => id !== wallId && (graph.dependents.get(id) ?? []).length > 0,
)

const trials: Trial[] = []
for (let i = 0; i < N; i++) {
  const gap = plantable[i % plantable.length]
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
      summary: (['taproot', 'linear', 'random', 'worksheet'] as Policy[])
        .map(summarise),
      trials,
    },
    null,
    1,
  ),
)
