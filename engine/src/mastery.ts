/**
 * Bayesian Knowledge Tracing, plus belief propagation along the DAG.
 *
 * Plain BKT treats every skill as independent, which is exactly wrong here:
 * the entire premise is that skills depend on each other. So after each
 * observation the change is diffused along prerequisite edges, damped per hop.
 *
 * The two directions are not symmetric, and the asymmetry is the pedagogy:
 *
 *   failing 4.NF.A.1   -> real doubt about 3.NF.A.1   (you probably can't do
 *                         the harder thing because the easier one is missing)
 *   passing 4.NF.A.1   -> strong confidence in 3.NF.A.1 (you could hardly have
 *                         done it otherwise)
 *   failing 3.NF.A.1   -> strong doubt about 4.NF.A.1  (it rests on this)
 *   passing 3.NF.A.1   -> only weak optimism about 4.NF.A.1 (necessary, not
 *                         sufficient -- and this is the asymmetry that stops
 *                         one easy correct answer lighting up the whole tree)
 */
import { Graph } from "./graph";
import { Beliefs, BktParams, PropagationConfig, Observation } from "./types";

const EPS = 1e-6;

export function clamp(p: number): number {
  return Math.min(1 - EPS, Math.max(EPS, p));
}

/** Posterior P(mastered | response), before the learning transition. */
export function bktPosterior(p: number, correct: boolean, k: BktParams): number {
  const num = correct ? p * (1 - k.slip) : p * k.slip;
  const den = correct
    ? p * (1 - k.slip) + (1 - p) * k.guess
    : p * k.slip + (1 - p) * (1 - k.guess);
  return clamp(den < EPS ? p : num / den);
}

/** Posterior plus the chance the learner just learned it from the attempt. */
export function bktUpdate(p: number, correct: boolean, k: BktParams): number {
  const post = bktPosterior(p, correct, k);
  return clamp(post + (1 - post) * k.learn);
}

/** P(correct) under the current belief -- the prior predictive. */
export function pCorrect(p: number, k: BktParams): number {
  return p * (1 - k.slip) + (1 - p) * k.guess;
}

export function initBeliefs(graph: Graph, k: BktParams): Beliefs {
  const b: Beliefs = {};
  for (const id of graph.ids) b[id] = k.prior;
  return b;
}

/**
 * How strongly a directly-tested node resists second-hand doubt. With
 * strength 2, one direct observation cuts incoming propagation to a third.
 *
 * Without this the engine talks itself out of things it has actually measured:
 * a learner answers a prerequisite correctly, then fails two skills that build
 * on it, and the propagated doubt drags the tested node back below the
 * mastery line. Evidence we gathered ourselves has to outrank evidence we
 * merely inferred, or there is no point gathering it.
 */
export const ANCHOR_STRENGTH = 2.0;

/** Node id -> how many times we have directly tested it. */
export type Anchors = Record<string, number>;

/**
 * Apply one observation and diffuse it through the graph.
 * Returns a new belief map; the input is not mutated.
 */
export function applyObservation(
  graph: Graph,
  beliefs: Beliefs,
  obs: Observation,
  k: BktParams,
  cfg: PropagationConfig,
  anchors: Anchors = {}
): Beliefs {
  const next: Beliefs = { ...beliefs };
  const before = beliefs[obs.nodeId] ?? k.prior;
  const after = bktUpdate(before, obs.correct, k);
  next[obs.nodeId] = after;

  const delta = after - before;
  if (Math.abs(delta) < EPS) return next;

  const anchored = (id: string) =>
    1 / (1 + ANCHOR_STRENGTH * (anchors[id] ?? 0));

  // toward prerequisites
  const up = graph.within(obs.nodeId, "prereqs", cfg.maxHops);
  for (const [id, hop] of up) {
    const damp = Math.pow(cfg.prereqDamp, hop) * anchored(id);
    next[id] = clamp((next[id] ?? k.prior) + delta * damp);
  }

  // toward dependents, with positive evidence attenuated further
  const down = graph.within(obs.nodeId, "dependents", cfg.maxHops);
  for (const [id, hop] of down) {
    let damp = Math.pow(cfg.dependentDamp, hop) * anchored(id);
    if (delta > 0) damp *= cfg.dependentPositiveScale;
    next[id] = clamp((next[id] ?? k.prior) + delta * damp);
  }

  return next;
}

/** Binary entropy in bits. */
export function entropy(p: number): number {
  const q = clamp(p);
  return -(q * Math.log2(q) + (1 - q) * Math.log2(1 - q));
}

/** Total uncertainty across the graph, in bits. */
export function totalEntropy(beliefs: Beliefs): number {
  let sum = 0;
  for (const id in beliefs) sum += entropy(beliefs[id]);
  return sum;
}
