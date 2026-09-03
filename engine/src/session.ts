/**
 * The descent: ask, update, propagate, decide whether we have found bedrock.
 *
 * Deliberately synchronous and side-effect free so the same code drives the
 * browser (offline play) and the eval harness (200 simulated learners).
 */
import { Graph } from "./graph";
import { GapPosterior } from "./diagnosis";
import { initBeliefs, applyObservation } from "./mastery";
import { selectNext, findBedrock } from "./selection";
import { DEFAULT_CONFIG } from "./types";
import type {
  Beliefs, Bedrock, DescentStep, EngineConfig, SkillGraph,
} from "./types";

export interface DescentResult {
  steps: DescentStep[];
  bedrock: Bedrock | null;
  beliefs: Beliefs;
  itemsUsed: number;
  stoppedBecause: "bedrock" | "budget";
}

/** Answers an item at a node; true = correct. */
export type Responder = (nodeId: string) => boolean;

export class Session {
  readonly graph: Graph;
  readonly cfg: EngineConfig;
  beliefs: Beliefs;
  readonly asked = new Set<string>();
  readonly steps: DescentStep[] = [];
  /** Direct-test counts, so measured evidence outranks inferred evidence. */
  readonly anchors: Record<string, number> = {};
  /** The corridor beneath the wall problem. Unset until seedFromWall. */
  scope?: Set<string>;
  /** The wall problem, excluded from being its own diagnosis. */
  wall?: string;
  /**
   * Exact posterior over which skill is the gap. This, not the per-node BKT
   * beliefs, is what decides the diagnosis. The learner's knowledge is
   * monotone along the DAG, so a question at N is a noisy test of "is the gap
   * in {N} u ancestors(N)?" -- which makes the posterior a plain categorical
   * we can update in closed form instead of approximating with damped
   * diffusion. Measured: 39% -> 71% exact identification.
   *
   * BKT beliefs are still maintained, because the repair bar and the lit roots
   * need a per-skill number, and "how solid does this feel" is a different
   * question from "where is the gap".
   */
  posterior?: GapPosterior;
  private candidates: string[] = [];

  constructor(data: SkillGraph, cfg: Partial<EngineConfig> = {}) {
    this.graph = new Graph(data);
    this.graph.assertAcyclic();
    this.cfg = { ...DEFAULT_CONFIG, ...cfg };
    this.beliefs = initBeliefs(this.graph, this.cfg.bkt);
  }

  /**
   * Seed the descent from the problem the learner just failed. Without this
   * the engine would open on whatever is globally most informative, which is
   * not what the child just walked in with.
   */
  seedFromWall(nodeId: string): void {
    this.scope = new Set([nodeId, ...this.graph.ancestors(nodeId)]);
    this.wall = nodeId;
    this.candidates = [...this.scope].filter((id) => id !== nodeId);
    this.posterior = new GapPosterior(
      this.graph, this.candidates, this.cfg.bkt);
    this.posterior.update(nodeId, false);   // the wall failure is evidence
    this.record(nodeId, false);
  }

  private record(nodeId: string, correct: boolean, gain = 0): void {
    const before = this.beliefs[nodeId] ?? this.cfg.bkt.prior;
    this.beliefs = applyObservation(
      this.graph, this.beliefs, { nodeId, correct },
      this.cfg.bkt, this.cfg.propagation, this.anchors);
    if (this.posterior && nodeId !== this.wall) {
      this.posterior.update(nodeId, correct);
    }
    // anchor AFTER applying, so this observation is not damped by itself
    this.anchors[nodeId] = (this.anchors[nodeId] ?? 0) + 1;
    this.asked.add(nodeId);
    this.steps.push({
      nodeId, correct, beliefBefore: before,
      beliefAfter: this.beliefs[nodeId], expectedGain: gain,
    });
  }

  next(): { nodeId: string; expectedGain: number } | null {
    if (this.asked.size >= this.cfg.maxItems) return null;
    if (this.bedrock()) return null;

    // Mutual information about the GAP's identity, not about per-node belief
    // entropy. The old objective rewarded questions that settled skills nobody
    // had asked about; this one only values questions that tell us where the
    // gap is.
    if (this.posterior) {
      const exhausted = new Set(
        Object.entries(this.anchors)
          .filter(([, c]) => c >= this.cfg.repeatCap)
          .map(([id]) => id),
      );
      const pick = this.posterior.choose(this.candidates, exhausted);
      if (pick) {
        return { nodeId: pick, expectedGain: this.posterior.expectedGain(pick) };
      }
    }
    return selectNext(
      this.graph, this.beliefs, this.asked, this.cfg, this.anchors, this.scope);
  }


  answer(nodeId: string, correct: boolean, gain = 0): void {
    this.record(nodeId, correct, gain);
  }

  bedrock(): Bedrock | null {
    if (this.posterior) {
      const best = this.posterior.best();
      if (best.confidence < this.cfg.gapConfidence) return null;
      return {
        nodeId: best.nodeId,
        supports: this.graph.prereqs.get(best.nodeId) ?? [],
        belief: this.beliefs[best.nodeId] ?? this.cfg.bkt.prior,
      };
    }
    return findBedrock(this.graph, this.beliefs, this.cfg, this.asked,
                       this.scope, this.wall, this.anchors);
  }

  /** How sure we are about the gap, and the runners-up. For a tutor brief. */
  diagnosis() {
    return this.posterior
      ? { best: this.posterior.best(), top: this.posterior.top(3) }
      : null;
  }

  /** Run the whole descent against a responder. */
  run(respond: Responder): DescentResult {
    for (;;) {
      const pick = this.next();
      if (!pick) break;
      this.answer(pick.nodeId, respond(pick.nodeId), pick.expectedGain);
    }
    const bedrock = this.bedrock();
    return {
      steps: this.steps,
      bedrock,
      beliefs: this.beliefs,
      itemsUsed: this.asked.size,
      stoppedBecause: bedrock ? "bedrock" : "budget",
    };
  }

  /**
   * The climb: the path from bedrock back up to the wall problem. This is the
   * order the learner re-earns the skills in, and the order the roots light up.
   */
  climbPath(from: string, to: string): string[] {
    const queue: string[][] = [[from]];
    const seen = new Set([from]);
    while (queue.length) {
      const path = queue.shift()!;
      const tail = path[path.length - 1];
      if (tail === to) return path;
      for (const nb of this.graph.dependents.get(tail) ?? []) {
        if (seen.has(nb)) continue;
        seen.add(nb);
        queue.push([...path, nb]);
      }
    }
    return [];
  }
}
