/**
 * The descent: ask, update, propagate, decide whether we have found bedrock.
 *
 * Deliberately synchronous and side-effect free so the same code drives the
 * browser (offline play) and the eval harness (200 simulated learners).
 */
import { Graph } from "./graph";
import { initBeliefs, applyObservation } from "./mastery";
import { selectNext, findBedrock, shouldStop, bedrockHypothesis, expectedGain } from "./selection";
import {
  Beliefs, Bedrock, DescentStep, EngineConfig, DEFAULT_CONFIG, SkillGraph,
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
    this.record(nodeId, false);
  }

  private record(nodeId: string, correct: boolean, gain = 0): void {
    const before = this.beliefs[nodeId] ?? this.cfg.bkt.prior;
    this.beliefs = applyObservation(
      this.graph, this.beliefs, { nodeId, correct },
      this.cfg.bkt, this.cfg.propagation, this.anchors);
    // anchor AFTER applying, so this observation is not damped by itself
    this.anchors[nodeId] = (this.anchors[nodeId] ?? 0) + 1;
    this.asked.add(nodeId);
    this.steps.push({
      nodeId, correct, beliefBefore: before,
      beliefAfter: this.beliefs[nodeId], expectedGain: gain,
    });
  }

  next(): { nodeId: string; expectedGain: number } | null {
    if (shouldStop(this.graph, this.beliefs, this.asked, this.cfg, this.scope)) return null;

    // Confirm the leading suspect before anything else. Information gain will
    // not do this on its own -- a node we already believe is broken has low
    // entropy, so it scores as uninformative -- but we refuse to name a gap we
    // never tested, so the hypothesis has to be probed deliberately.
    const suspect = bedrockHypothesis(
      this.graph, this.beliefs, this.cfg, this.asked, this.scope);
    if (suspect && !this.asked.has(suspect)) {
      return { nodeId: suspect, expectedGain: this.gain(suspect) };
    }

    // Suspect confirmed -- now check the floor directly beneath it. Left to
    // general information gain the engine wanders the corridor until it
    // happens to hit a support, which cost four items in testing. "Is the
    // thing underneath actually solid?" is the question a teacher would ask
    // next anyway.
    if (suspect) {
      const unprobed = (this.graph.prereqs.get(suspect) ?? [])
        .filter((s) => !this.asked.has(s) && (!this.scope || this.scope.has(s)));
      if (unprobed.length) {
        return unprobed
          .map((id) => ({ nodeId: id, expectedGain: this.gain(id) }))
          .sort((a, b) => b.expectedGain - a.expectedGain)[0];
      }
    }

    return selectNext(
      this.graph, this.beliefs, this.asked, this.cfg, this.anchors, this.scope);
  }

  private gain(nodeId: string): number {
    return expectedGain(
      this.graph, this.beliefs, nodeId, this.cfg, this.anchors);
  }

  answer(nodeId: string, correct: boolean, gain = 0): void {
    this.record(nodeId, correct, gain);
  }

  bedrock(): Bedrock | null {
    return findBedrock(this.graph, this.beliefs, this.cfg, this.asked, this.scope);
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
