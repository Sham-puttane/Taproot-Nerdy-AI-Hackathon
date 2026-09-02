/**
 * Shared types for the mastery engine.
 *
 * This engine is the single source of truth for adaptive behaviour and runs in
 * two places: in the browser (so the whole descent works offline) and under
 * Node (so the Python eval harness can drive it through the CLI). There is
 * deliberately no second implementation to drift from.
 */

/** A skill node: one Common Core standard in the prerequisite DAG. */
export interface SkillNode {
  id: string;
  code: string;          // e.g. "3.NF.A.1"
  grade: string;         // "K".."5"
  depth: number;         // topological depth, 0 = most foundational
  text: string;
  skills: string[];      // granular learning components
}

/** Directed edge: `from` is a prerequisite of `to`. */
export type Edge = [string, string];

export interface SkillGraph {
  nodes: SkillNode[];
  edges: Edge[];
}

/**
 * Bayesian Knowledge Tracing parameters.
 *
 * slip  - knows it, answers wrong anyway
 * guess - doesn't know it, answers right anyway
 *
 * guess defaults to 0.25 because items are 4-option multiple choice, so a
 * blind guess lands a quarter of the time. Setting it lower would make the
 * engine over-credit lucky answers.
 */
export interface BktParams {
  prior: number;
  learn: number;
  slip: number;
  guess: number;
}

/**
 * prior is 0.5 -- maximum entropy -- rather than the lower value a BKT model
 * fitted to population base rates would use. This is a diagnostic: before it
 * has asked anything it knows nothing, and it must not mistake that ignorance
 * for evidence of a gap. Starting lower made every node look "confidently
 * unmastered" from the first frame, so bedrock resolved before a single
 * question was asked. Genuine ignorance also gives the information-gain
 * selector the most room to work.
 */
export const DEFAULT_BKT: BktParams = {
  prior: 0.5,
  learn: 0.12,
  slip: 0.1,
  guess: 0.25,
};

/** Belief state: node id -> probability that the learner has mastered it. */
export type Beliefs = Record<string, number>;

export interface Observation {
  nodeId: string;
  correct: boolean;
}

export interface PropagationConfig {
  /**
   * Per-hop damping toward prerequisites. Higher than the dependent direction
   * because the implication is stronger: doing 4.NF.A.1 essentially requires
   * 3.NF.A.1, so evidence about the former says a lot about the latter.
   */
  prereqDamp: number;
  /**
   * Per-hop damping toward dependents. Weaker, and asymmetric in practice:
   * failing a prerequisite strongly predicts failing what builds on it, but
   * mastering one only makes the next thing possible, not certain.
   */
  dependentDamp: number;
  /** Extra attenuation applied to positive evidence travelling upward. */
  dependentPositiveScale: number;
  maxHops: number;
}

export const DEFAULT_PROPAGATION: PropagationConfig = {
  prereqDamp: 0.55,
  dependentDamp: 0.4,
  dependentPositiveScale: 0.3,
  maxHops: 3,
};

export interface EngineConfig {
  bkt: BktParams;
  propagation: PropagationConfig;
  /** Belief above this counts as mastered, below (1 - this) as not. */
  masteryThreshold: number;
  /** How sure we must be before we stop the descent. */
  confidenceMargin: number;
  maxItems: number;
}

export const DEFAULT_CONFIG: EngineConfig = {
  bkt: DEFAULT_BKT,
  propagation: DEFAULT_PROPAGATION,
  masteryThreshold: 0.6,
  confidenceMargin: 0.15,
  maxItems: 12,
};

export interface Bedrock {
  nodeId: string;
  /** Prerequisites, all of which the learner does appear to hold. */
  supports: string[];
  belief: number;
}

export interface DescentStep {
  nodeId: string;
  correct: boolean;
  beliefBefore: number;
  beliefAfter: number;
  /** Expected information gain, in bits, that motivated choosing this item. */
  expectedGain: number;
}
