/**
 * A posterior over WHICH SKILL IS THE GAP.
 *
 * The per-node BKT beliefs in mastery.ts diffuse evidence along the graph with
 * a damping constant. That is a heuristic standing in for something we can
 * compute exactly, because the learner's knowledge is MONOTONE along the DAG:
 * if the gap sits at g, then g and everything built on top of g are broken,
 * and everything beneath g is intact.
 *
 * So asking a question at node N is a noisy test of exactly one proposition:
 *
 *     "is the gap somewhere in {N} union ancestors(N)?"
 *
 *   N is broken  <=>  N is the gap, or the gap is a prerequisite of N
 *
 * which makes this noisy binary search over a set system, and the posterior
 * over gap identity is a plain categorical distribution we can update in
 * closed form:
 *
 *     P(correct | gap = g, tested N) = 1 - slip   if g is NOT under N
 *                                    = guess      if it is
 *
 * Diffusion had to spread doubt symmetrically and then be talked out of it
 * with anchors and hop caps. This does not: one answer reweights every
 * hypothesis by exactly how well it predicted that answer.
 *
 * The model assumes a SINGLE gap. Real learners have several, and the honest
 * reading of a flat posterior is "more than one thing is broken" rather than
 * "we are confused" -- which is itself useful, and is why `confidence` is
 * reported rather than hidden.
 */
import { Graph } from "./graph";
import type { BktParams } from "./types";

export interface GapEstimate {
  nodeId: string;
  confidence: number;
  /** Bits of uncertainty left about which node is the gap. */
  entropy: number;
}

export class GapPosterior {
  private readonly p = new Map<string, number>();
  /** node -> the hypotheses that would make that node broken */
  private readonly under = new Map<string, Set<string>>();

  private readonly candidates: string[];
  private readonly k: BktParams;

  // Written as explicit fields rather than constructor parameter properties:
  // the app compiles this same source with `erasableSyntaxOnly`, which
  // forbids them.
  constructor(graph: Graph, candidates: string[], k: BktParams) {
    this.candidates = candidates;
    this.k = k;
    const w = 1 / candidates.length;
    for (const id of candidates) this.p.set(id, w);
    for (const id of graph.ids) {
      this.under.set(id, new Set([id, ...graph.ancestors(id)]));
    }
  }

  /** P(this node is broken) under the current posterior. */
  brokenProb(nodeId: string): number {
    const set = this.under.get(nodeId);
    if (!set) return 0;
    let s = 0;
    for (const g of set) s += this.p.get(g) ?? 0;
    return s;
  }

  /** Fold in one observation. Exact, not damped. */
  update(nodeId: string, correct: boolean): void {
    const set = this.under.get(nodeId) ?? new Set();
    let total = 0;
    for (const [g, prior] of this.p) {
      const broken = set.has(g);
      const pCorrect = broken ? this.k.guess : 1 - this.k.slip;
      const lik = correct ? pCorrect : 1 - pCorrect;
      const post = prior * lik;
      this.p.set(g, post);
      total += post;
    }
    if (total <= 0) return; // impossible evidence; keep the old belief
    for (const [g, v] of this.p) this.p.set(g, v / total);
  }

  entropy(): number {
    let h = 0;
    for (const v of this.p.values()) if (v > 0) h -= v * Math.log2(v);
    return h;
  }

  best(): GapEstimate {
    let bestId = this.candidates[0];
    let bestP = -1;
    for (const [g, v] of this.p) {
      if (v > bestP) {
        bestP = v;
        bestId = g;
      }
    }
    return { nodeId: bestId, confidence: bestP, entropy: this.entropy() };
  }

  /** Top-n hypotheses, most likely first. Useful for a tutor brief. */
  top(n = 3): GapEstimate[] {
    return [...this.p.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([nodeId, confidence]) => ({
        nodeId,
        confidence,
        entropy: this.entropy(),
      }));
  }

  /**
   * Expected bits gained about the gap's identity by asking at `nodeId`.
   *
   * This is mutual information between the answer and the gap, which is the
   * quantity we actually care about -- unlike total per-node belief entropy,
   * which rewards questions that reduce uncertainty about things nobody asked.
   */
  expectedGain(nodeId: string): number {
    const set = this.under.get(nodeId);
    if (!set) return 0;
    const pBroken = this.brokenProb(nodeId);
    const pc = pBroken * this.k.guess + (1 - pBroken) * (1 - this.k.slip);

    const branch = (correct: boolean): number => {
      let total = 0;
      const post: number[] = [];
      for (const [g, prior] of this.p) {
        const broken = set.has(g);
        const pCorrect = broken ? this.k.guess : 1 - this.k.slip;
        const lik = correct ? pCorrect : 1 - pCorrect;
        const v = prior * lik;
        post.push(v);
        total += v;
      }
      if (total <= 0) return 0;
      let h = 0;
      for (const v of post) {
        const q = v / total;
        if (q > 0) h -= q * Math.log2(q);
      }
      return h;
    };

    return this.entropy() - (pc * branch(true) + (1 - pc) * branch(false));
  }

  /** The most informative question available, excluding `exclude`. */
  choose(pool: string[], exclude: Set<string>): string | null {
    let bestId: string | null = null;
    let bestGain = -Infinity;
    for (const id of pool) {
      if (exclude.has(id)) continue;
      const g = this.expectedGain(id);
      if (g > bestGain) {
        bestGain = g;
        bestId = id;
      }
    }
    return bestId;
  }

  snapshot(): Record<string, number> {
    return Object.fromEntries(this.p);
  }
}
