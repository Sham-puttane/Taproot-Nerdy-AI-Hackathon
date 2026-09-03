/**
 * Item selection by expected information gain, and bedrock detection.
 *
 * This is what collapses a 40-item worksheet into an ~8-item descent. For each
 * candidate node we simulate BOTH outcomes -- correct and incorrect -- with
 * full propagation, measure the total entropy of the resulting graph, and
 * weight by how likely each outcome is. The item that is expected to remove
 * the most uncertainty from the WHOLE graph wins.
 *
 * Measuring total graph entropy rather than the candidate node's own entropy
 * is the important part: it is what makes the engine prefer a question in the
 * middle of an uncertain chain over one that only settles a single leaf. That
 * is binary search over the prerequisite graph, and it falls out of the maths
 * rather than being hand-coded.
 */
import { Graph } from "./graph";
import { applyObservation, pCorrect, totalEntropy } from "./mastery";
import type { Anchors } from "./mastery";
import type { Beliefs, Bedrock, EngineConfig } from "./types";

export interface Candidate {
  nodeId: string;
  expectedGain: number;
}

/** Expected reduction in total graph entropy, in bits, from testing `nodeId`. */
export function expectedGain(
  graph: Graph,
  beliefs: Beliefs,
  nodeId: string,
  cfg: EngineConfig,
  anchors: Anchors = {}
): number {
  const before = totalEntropy(beliefs);
  const p = beliefs[nodeId] ?? cfg.bkt.prior;
  const pc = pCorrect(p, cfg.bkt);

  const ifRight = applyObservation(
    graph, beliefs, { nodeId, correct: true }, cfg.bkt, cfg.propagation, anchors);
  const ifWrong = applyObservation(
    graph, beliefs, { nodeId, correct: false }, cfg.bkt, cfg.propagation, anchors);

  const after = pc * totalEntropy(ifRight) + (1 - pc) * totalEntropy(ifWrong);
  return before - after;
}

/**
 * Rank askable nodes by expected gain.
 *
 * `asked` nodes are excluded -- re-asking settles nothing.
 *
 * `scope` is the corridor: the skills the wall problem actually rests on. It
 * matters more than it looks. Unscoped, the engine spends items on grade-1
 * addition facts, because a high-entropy node with many neighbours looks
 * informative to a measure that treats the whole graph as equally relevant.
 * But a child stuck on adding unlike fractions did not walk in with a question
 * about counting on, and asking her one spends the only currency she has --
 * patience. The gap must lie beneath the wall, so we search beneath the wall.
 */
export function rankCandidates(
  graph: Graph,
  beliefs: Beliefs,
  asked: Set<string>,
  cfg: EngineConfig,
  anchors: Anchors = {},
  scope?: Set<string>
): Candidate[] {
  const out: Candidate[] = [];
  for (const id of graph.ids) {
    if (asked.has(id)) continue;
    if (scope && !scope.has(id)) continue;
    out.push({ nodeId: id, expectedGain: expectedGain(graph, beliefs, id, cfg, anchors) });
  }
  out.sort((a, b) => b.expectedGain - a.expectedGain);
  return out;
}

export function selectNext(
  graph: Graph,
  beliefs: Beliefs,
  asked: Set<string>,
  cfg: EngineConfig,
  anchors: Anchors = {},
  scope?: Set<string>
): Candidate | null {
  const ranked = rankCandidates(graph, beliefs, asked, cfg, anchors, scope);
  return ranked.length ? ranked[0] : null;
}

/**
 * The two bars are deliberately asymmetric, because the two mistakes cost
 * very different amounts.
 *
 * Naming bedrock demands strong evidence: we are about to tell a child and a
 * parent "this specific thing is your problem", and being wrong there sends
 * them to repair something that was never broken.
 *
 * Accepting a prerequisite as sound only needs ordinary confidence. Being
 * wrong costs a repair that starts one level too high -- the learner does some
 * work they did not strictly need, and the next descent catches the rest.
 */
const confidentlyMissing = (p: number, c: EngineConfig) =>
  p <= c.masteryThreshold - c.confidenceMargin;

/**
 * How many times we must have directly tested a node before it may be named
 * as the gap.
 *
 * One wrong answer takes a belief from 0.5 to about 0.22, which already clears
 * the "confidently missing" line -- so before this, a single unlucky answer
 * was enough to condemn a skill. With a 1-in-4 guess rate and a 1-in-10 slip
 * rate that happens constantly, and because bedrock prefers the most
 * FOUNDATIONAL candidate, every spurious deep failure captured the diagnosis
 * and dragged it below the real gap. Measured: it cost roughly two thirds of
 * the accuracy.
 *
 * A careful diagnostician would not condemn a skill on one answer either.
 */
export const MIN_EVIDENCE = 2;

/**
 * Bedrock: the most foundational skill the learner confidently does NOT have,
 * all of whose prerequisites they confidently DO have. Everything below it is
 * intact, so drilling deeper wastes the learner's time; everything above it is
 * unreachable until it is repaired.
 *
 * `asked` is required, and it is a correctness constraint rather than an
 * optimisation. Propagated doubt alone can push a node below the confidence
 * line -- a failure three hops up smears downward -- and a node with no
 * prerequisites then satisfies "all prerequisites held" VACUOUSLY, so an
 * untested root becomes instant bedrock. Beyond the maths, naming a gap the
 * child was never actually asked about would be indefensible: we would be
 * telling a parent "here is her problem" on inference alone.
 *
 * Prerequisites may still be believed on propagated evidence. Being wrong
 * there is far cheaper -- it means we repair slightly higher than necessary,
 * not that we misdiagnose the child.
 */
export function findBedrock(
  graph: Graph,
  beliefs: Beliefs,
  cfg: EngineConfig,
  asked: Set<string>,
  scope?: Set<string>,
  /** The problem she walked in with. It is the symptom, never the cause. */
  wall?: string,
  anchors: Anchors = {}
): Bedrock | null {
  const missing = (id: string) =>
    confidentlyMissing(beliefs[id] ?? cfg.bkt.prior, cfg);

  const candidates: Bedrock[] = [];
  for (const id of graph.ids) {
    if ((anchors[id] ?? 0) < MIN_EVIDENCE) continue;
    // The wall is seeded as a failure and marked asked, so it always looks
    // like a candidate -- and answering "your problem is the thing you just
    // failed" diagnoses nothing. Excluding it forces a real descent.
    if (wall && id === wall) continue;
    if (!asked.has(id) || !missing(id)) continue;

    // Nothing broken may lie beneath it -- otherwise THAT is the real floor.
    // Only TESTED failures veto: the wall failure propagates doubt downward
    // across the whole corridor, so counting inferred doubt here would let a
    // never-asked grade-K node permanently block every diagnosis.
    let deeperBreak = false;
    for (const a of graph.ancestors(id)) {
      if (asked.has(a) && missing(a)) { deeperBreak = true; break; }
    }
    if (deeperBreak) continue;

    // We must have actually probed underneath, or we are guessing that the
    // floor is solid rather than having checked. A node with no prerequisites
    // in scope is genuinely the bottom, so it needs no probe.
    const supports = (graph.prereqs.get(id) ?? [])
      .filter((s) => !scope || scope.has(s));
    const probed = supports.some((s) => asked.has(s));
    if (supports.length && !probed) continue;

    candidates.push({ nodeId: id, supports, belief: beliefs[id] });
  }
  if (!candidates.length) return null;
  candidates.sort((a, b) => {
    const da = graph.node(a.nodeId).depth;
    const db = graph.node(b.nodeId).depth;
    if (da !== db) return da - db;          // most foundational first
    return a.belief - b.belief;
  });
  return candidates[0];
}

/**
 * The leading suspect: the most foundational node in the corridor that we
 * currently believe is missing, with nothing broken beneath it -- whether or
 * not we have actually asked about it.
 *
 * This exists because pure information gain will never confirm its own
 * hypothesis. Once propagation has pushed the true gap down to a confident
 * 0.2, that node has LOW entropy, so the selector scores it as uninformative
 * and keeps probing elsewhere -- while `findBedrock` refuses to name anything
 * untested. The engine talks itself into a corner: sure enough to stop
 * looking, never sure enough to answer.
 *
 * So we make the diagnostic move explicit. Form a hypothesis from the
 * propagated belief, then spend one item testing it directly. That is also
 * the difference between "the model inferred this" and "we asked her, and she
 * could not do it" -- which is the only version worth showing a parent.
 */
export function bedrockHypothesis(
  graph: Graph,
  beliefs: Beliefs,
  cfg: EngineConfig,
  asked: Set<string>,
  scope?: Set<string>,
  wall?: string
): string | null {
  const missing = (id: string) =>
    confidentlyMissing(beliefs[id] ?? cfg.bkt.prior, cfg);

  const suspects = graph.ids.filter((id) => {
    if (wall && id === wall) return false;
    if (scope && !scope.has(id)) return false;
    if (!missing(id)) return false;
    // same rule as findBedrock: only tested failures count as "broken below"
    for (const a of graph.ancestors(id)) {
      if (asked.has(a) && missing(a)) return false;
    }
    return true;
  });
  if (!suspects.length) return null;
  suspects.sort((a, b) => graph.node(a).depth - graph.node(b).depth);
  return suspects[0];
}

/** True once bedrock is identified, or we have spent the item budget. */
export function shouldStop(
  graph: Graph,
  beliefs: Beliefs,
  asked: Set<string>,
  cfg: EngineConfig,
  scope?: Set<string>,
  wall?: string,
  anchors: Anchors = {}
): boolean {
  if (asked.size >= cfg.maxItems) return true;
  return findBedrock(graph, beliefs, cfg, asked, scope, wall, anchors) !== null;
}
